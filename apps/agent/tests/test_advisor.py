import asyncio
import copy
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
from pydantic import ValidationError

from agent.advisor import Advisor
from agent.main import app
from agent.openai_agent import OpenAIConfigurationError, recommend
from agent.schemas import CareerContext, ModelDecision


def payload():
    return {
        "as_of_date": "2026-10-01",
        "employee": {
            "employee_id": "new-employee-1001", "full_name": "PRIVATE_NAME",
            "role": "Backend Engineer", "grade": "Middle",
            "skills": {"SYSTEM": 2, "SPEAK": 0}, "last_review_date": "2026-09-01",
            "career_goal": {"target_role": "Backend Engineer", "target_grade": "Senior"},
        },
        "skills": [{"skill_id": "SYSTEM", "name": "System Design"},
                   {"skill_id": "SPEAK", "name": "Public Speaking"}],
        "role_profiles": [{"role": "Backend Engineer", "grade": "Senior",
                           "required_skills": {"SYSTEM": 4, "SPEAK": 2}, "critical_skills": ["SYSTEM"]}],
        "events": [
            {"event_id": "design", "title": "System design course", "format": "offline",
             "duration_hours": 16, "mandatory": False, "target_roles": ["Backend Engineer"],
             "target_grades": ["Middle"], "upcoming_sessions": ["2026-10-10"],
             "develops_skills": [{"skill_id": "SYSTEM", "gain": 2, "max_level": 4}]},
            {"event_id": "speaking", "title": "Speaking workshop", "format": "online",
             "duration_hours": 1, "mandatory": False, "target_roles": ["Backend Engineer"],
             "target_grades": ["Middle"], "upcoming_sessions": ["2026-10-02"],
             "develops_skills": [{"skill_id": "SPEAK", "gain": 1, "max_level": 3}]},
        ],
        "activity_history": [],
    }


def advisor(data=None):
    return Advisor(CareerContext.model_validate(payload() if data is None else data))


class RankingTests(unittest.TestCase):
    def test_tz_trap_critical_skill_before_short_speaking_despite_larger_gap(self):
        data = payload()
        data['activity_history'] = [
            {"event_id": "speaking", "record_id": str(i), "status": "no_show", "date": "2026-09-10"}
            for i in range(3)
        ]
        plan = advisor(data).plan()
        first = plan['recommendations'][0]
        self.assertEqual(first['event']['event_id'], 'design')
        self.assertEqual({f['category'] for f in first['factors']}, {'grade', 'gap', 'history', 'target'})
        speaking = next(c for c in plan['recommendations'] if c['event']['event_id'] == 'speaking')
        self.assertIn('неявки: 3', speaking['explanation'])

    def test_history_prefers_an_alternative_format_for_same_critical_gap(self):
        data = payload()
        alternative = copy.deepcopy(data['events'][0])
        alternative.update(event_id='design_self', format='self_paced', upcoming_sessions=[])
        data['events'].append(alternative)
        data['activity_history'] = [
            {"event_id": "design", "status": status, "date": "2026-09-10"}
            for status in ('no_show', 'declined', 'dropped')
        ]
        choices = advisor(data).rules_selection()
        self.assertEqual(choices[0].event.event_id, 'design_self')
        self.assertNotIn('design', [x.event.event_id for x in choices])  # Gap already closed.

    def test_eligibility_excludes_completed_mandatory_prerequisites_and_no_session(self):
        data = payload()
        for event_id, changes in [
            ('mandatory', {'mandatory': True}), ('locked', {'prerequisites': {'SPEAK': 5}}),
            ('future_grade', {'target_grades': ['Senior']}), ('no_dates', {'upcoming_sessions': []}),
            ('done', {}),
        ]:
            event = copy.deepcopy(data['events'][0])
            event.update(event_id=event_id, **changes)
            data['events'].append(event)
        data['activity_history'] = [{'event_id': 'done', 'status': 'completed'}]
        self.assertEqual(advisor(data).candidate_ids, {'design', 'speaking'})

    def test_steps_do_not_double_count_same_gap_and_never_exceed_three(self):
        data = payload()
        for i in range(6):
            event = copy.deepcopy(data['events'][0])
            event['event_id'] = f'design_{i}'
            data['events'].append(event)
        selected = advisor(data).rules_selection()
        self.assertEqual(len(selected), 2)
        self.assertEqual(sum(any(g.skill_id == 'SYSTEM' for g in c.gains) for c in selected), 1)

    def test_completion_updates_progress_once_and_excludes_completed_event(self):
        data = payload()
        data['events'][0]['develops_skills'][0].update(gain=1, max_level=5)
        baseline = advisor(data).plan()
        data['activity_history'] = [
            {'event_id': 'design', 'record_id': 'R1', 'status': 'completed', 'completed_at': '2026-09-15T12:00:00Z'},
            {'event_id': 'design', 'record_id': 'R2', 'status': 'completed', 'completed_at': '2026-09-16'},
        ]
        updated = advisor(data).plan()
        self.assertEqual(updated['effective_skills']['SYSTEM'], 3)
        self.assertGreater(updated['readiness'], baseline['readiness'])
        self.assertEqual(updated, advisor(data).plan())
        self.assertNotIn('design', [x['event']['event_id'] for x in updated['recommendations']])

    def test_unknown_or_future_completion_dates_do_not_grant_skills(self):
        for extra in ({}, {'completed_at': '2026-11-01'}, {'completed_at': '2026-08-01'}):
            with self.subTest(extra=extra):
                data = payload()
                data['activity_history'] = [{'event_id': 'design', 'status': 'completed', **extra}]
                self.assertEqual(advisor(data).plan()['effective_skills']['SYSTEM'], 2)

    def test_repeatable_club_cannot_be_recommended_twice_on_the_snapshot_day(self):
        data = payload()
        data['events'][0]['event_id'] = 'EV_036'
        data['events'][0]['develops_skills'][0]['gain'] = 1
        for completion in (
            {'date': '2026-09-30', 'completed_at': '2026-10-01T12:00:00.000Z'},
            {'date': '2026-10-01'},
        ):
            with self.subTest(completion=completion):
                data['activity_history'] = [
                    {'event_id': 'EV_036', 'status': 'completed', **completion},
                ]
                self.assertNotIn('EV_036', advisor(data).candidate_ids)
        data['activity_history'] = [
            {'event_id': 'EV_036', 'status': 'completed', 'date': '2026-09-30',
             'completed_at': '2026-09-30T12:00:00.000Z'},
        ]
        self.assertIn('EV_036', advisor(data).candidate_ids)

    def test_input_rejects_out_of_range_skills_and_foreign_history(self):
        data = payload()
        data['employee']['skills']['SYSTEM'] = 9
        with self.assertRaises(ValidationError):
            advisor(data)
        data = payload()
        data['activity_history'] = [{'employee_id': 'another-person', 'event_id': 'design', 'status': 'completed'}]
        with self.assertRaises(ValidationError):
            advisor(data)

    def test_lead_without_goal_has_a_complete_empty_plan(self):
        data = payload()
        data['employee'].update(grade='Lead', career_goal=None)
        plan = advisor(data).plan()
        self.assertIsNone(plan['career_goal'])
        self.assertEqual(plan['recommendations'], [])
        self.assertIsNone(plan['readiness'])


class ModelBoundaryTests(unittest.IsolatedAsyncioTestCase):
    async def test_recommendations_request_only_event_ids_with_low_astra_reasoning(self):
        async def structured_response(**kwargs):
            schema = kwargs['text_format']
            data = {'event_ids': ['design', 'speaking']}
            if 'reply' in schema.model_fields:
                data['reply'] = 'Unnecessary generated explanation.'
            return SimpleNamespace(status='completed', output_parsed=schema.model_validate(data))

        parse = AsyncMock(side_effect=structured_response)
        client = SimpleNamespace(responses=SimpleNamespace(parse=parse))
        with patch.dict('os.environ', {'OPENAI_MODEL': 'gpt-6-astra'}), \
                patch('agent.openai_agent.get_client', return_value=client):
            result = await recommend(advisor())

        self.assertEqual(result.mode, 'ai')
        self.assertEqual(result.model, 'gpt-6-astra')
        self.assertEqual([r.event.event_id for r in result.recommendations], ['design', 'speaking'])
        self.assertTrue(result.message)
        self.assertTrue(all(len(r.factors) >= 3 and r.explanation for r in result.recommendations))
        call = parse.call_args.kwargs
        self.assertEqual(set(call['text_format'].model_fields), {'event_ids'})
        self.assertEqual(call['reasoning'], {'effort': 'low'})
        self.assertLessEqual(call['max_output_tokens'], 512)
        self.assertNotIn('В reply', call['instructions'])

    async def test_non_reasoning_model_does_not_receive_astra_reasoning_setting(self):
        parse = AsyncMock(return_value=SimpleNamespace(
            status='completed', output_parsed=ModelDecision(event_ids=['design'], reply='План готов.'),
        ))
        client = SimpleNamespace(responses=SimpleNamespace(parse=parse))
        with patch.dict('os.environ', {'OPENAI_MODEL': 'gpt-4.1-mini'}), \
                patch('agent.openai_agent.get_client', return_value=client):
            result = await recommend(advisor(), 'Как развиваться?')
        self.assertEqual(result.mode, 'ai')
        self.assertIs(parse.call_args.kwargs['text_format'], ModelDecision)
        self.assertNotIn('reasoning', parse.call_args.kwargs)

    async def test_valid_model_selection_matches_typescript_contract_and_excludes_identity(self):
        parse = AsyncMock(return_value=SimpleNamespace(
            status='completed', output_parsed=ModelDecision(event_ids=['design', 'speaking'], reply='План готов.'),
        ))
        with patch('agent.openai_agent.get_client', return_value=SimpleNamespace(responses=SimpleNamespace(parse=parse))):
            result = await recommend(advisor(), 'Как развиваться?')
        self.assertEqual(result.mode, 'ai')
        self.assertEqual(set(result.model_dump()), {'mode', 'model', 'message', 'recommendations', 'generated_at', 'duration_ms'})
        self.assertEqual(set(result.recommendations[0].model_dump()),
                         {'event', 'score', 'factors', 'next_session', 'gains', 'in_progress', 'explanation'})
        call = parse.call_args.kwargs
        self.assertIs(call['text_format'], ModelDecision)
        self.assertFalse(call['store'])
        self.assertNotIn('PRIVATE_NAME', str(call['input']))
        self.assertNotIn('new-employee-1001', str(call['input']))

    async def test_invalid_ai_ids_order_or_duplicate_gain_fall_back_to_rules(self):
        data = payload()
        extra = copy.deepcopy(data['events'][0]); extra['event_id'] = 'design_copy'
        data['events'].append(extra)
        for ids in (['invented'], [], ['design', 'design'], ['speaking'], ['design', 'design_copy']):
            with self.subTest(ids=ids):
                with patch('agent.openai_agent._request_decision', new=AsyncMock(return_value=ModelDecision(event_ids=ids, reply='bad'))):
                    result = await recommend(advisor(data))
                self.assertEqual(result.mode, 'rules')
                self.assertEqual(result.recommendations[0].event.event_id, 'design')

    async def test_deadline_cancels_slow_model_and_returns_explained_rules(self):
        async def slow(*args):
            await asyncio.sleep(1)
        with patch('agent.openai_agent._request_decision', side_effect=slow), patch('agent.openai_agent.AI_DEADLINE_SECONDS', 0.01):
            result = await recommend(advisor())
        self.assertEqual(result.mode, 'rules')
        self.assertLess(result.duration_ms, 500)
        self.assertTrue(result.recommendations[0].explanation)

    async def test_missing_key_and_refusal_do_not_break_recommendations(self):
        with patch('agent.openai_agent.get_client', side_effect=OpenAIConfigurationError('missing')):
            result = await recommend(advisor())
        self.assertEqual(result.mode, 'rules')
        parse = AsyncMock(return_value=SimpleNamespace(status='completed', output_parsed=None))
        with patch('agent.openai_agent.get_client', return_value=SimpleNamespace(responses=SimpleNamespace(parse=parse))):
            result = await recommend(advisor())
        self.assertEqual(result.mode, 'rules')

    async def test_no_candidates_does_not_call_model_for_recommendation_endpoint(self):
        data = payload(); data['events'] = []
        with patch('agent.openai_agent.get_client', side_effect=AssertionError('must not call')):
            result = await recommend(advisor(data))
        self.assertEqual(result.recommendations, [])
        self.assertEqual(result.mode, 'rules')


class ApiContractTests(unittest.TestCase):
    def test_rest_returns_same_recommendations_contract_in_endpoint_and_chat(self):
        parse = AsyncMock(return_value=SimpleNamespace(
            status='completed', output_parsed=ModelDecision(event_ids=['design'], reply='Следующий шаг — System Design.'),
        ))
        client_stub = SimpleNamespace(responses=SimpleNamespace(parse=parse))
        with TestClient(app) as client, patch('agent.openai_agent.get_client', return_value=client_stub):
            direct = client.post('/api/v1/advisor/recommendations', json={'context': payload()})
            self.assertEqual(direct.status_code, 200)
            chat = client.post('/api/v1/advisor/chat', json={'context': payload(), 'message': 'Что пройти?'})
            self.assertEqual(chat.status_code, 200)
            self.assertEqual(direct.json()['recommendations'], chat.json()['recommendations']['recommendations'])
            self.assertEqual(chat.json()['plan']['recommendations'], direct.json()['recommendations'])
            self.assertEqual(direct.json()['recommendations'][0]['event']['upcoming_sessions'], ['2026-10-10'])
            self.assertEqual(len(direct.json()['recommendations'][0]['factors']), 4)
            invalid = payload(); invalid['employee']['skills']['SYSTEM'] = 6
            response = client.post('/api/v1/advisor/recommendations', json={'context': invalid})
            self.assertEqual(response.status_code, 422)
            self.assertEqual(parse.await_count, 2)


if __name__ == '__main__':
    unittest.main()

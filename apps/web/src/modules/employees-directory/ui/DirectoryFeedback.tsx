import { AlertCircle, LockKeyhole, RefreshCw } from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Skeleton,
} from "@/shared/components/ui";
import { Spinner } from "@/shared/components/ui/spinner";
import {
  getApiErrorMessage,
  getApiErrorStatus,
} from "@/shared/lib/client/custom-instance";

import type { EmployeesDirectoryMessages } from "../model/employees-directory.messages";

export function DirectoryForbidden({
  messages,
}: {
  messages: EmployeesDirectoryMessages;
}) {
  return (
    <Alert>
      <LockKeyhole aria-hidden="true" />
      <AlertTitle>{messages.forbidden}</AlertTitle>
      <AlertDescription>{messages.forbiddenHint}</AlertDescription>
    </Alert>
  );
}

export function DirectoryError({
  error,
  title,
  messages,
  retry,
  isFetching,
  profile = false,
}: {
  error: unknown;
  title: string;
  messages: EmployeesDirectoryMessages;
  retry: () => void;
  isFetching: boolean;
  profile?: boolean;
}) {
  const status = getApiErrorStatus(error);
  if (status === 401 || status === 403) {
    return <DirectoryForbidden messages={messages} />;
  }
  const notFound = profile && status === 404;
  return (
    <Alert variant="destructive">
      <AlertCircle aria-hidden="true" />
      <AlertTitle>{notFound ? messages.profileNotFound : title}</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-3">
        <p>
          {notFound
            ? messages.profileNotFoundHint
            : getApiErrorMessage(error, title)}
        </p>
        <Button variant="outline" disabled={isFetching} onClick={retry}>
          {isFetching ? (
            <Spinner aria-hidden="true" />
          ) : (
            <RefreshCw aria-hidden="true" />
          )}
          {isFetching ? messages.refreshing : messages.retry}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export function DirectorySkeleton({ label }: { label: string }) {
  return (
    <section className="space-y-4" aria-busy="true" aria-label={label}>
      <p role="status" className="sr-only">
        {label}
      </p>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </section>
  );
}

module.exports = [
  {
    type: "input",
    name: "module",
    message: "Module name? (src/modules/<module>)",
  },
  {
    type: "input",
    name: "name",
    message: "Component name? (PascalCase)",
  },
  {
    type: "confirm",
    name: "client",
    message: "Интерактивный (client-компонент с 'use client')?",
  },
];

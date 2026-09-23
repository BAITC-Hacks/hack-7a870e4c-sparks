---
to: src/modules/<%= module %>/ui/<%= name %>.tsx
---
<% if (client) { -%>
"use client";

<% } -%>
import type React from "react";

export interface <%= name %>Props {
  className?: string;
}

/**
 * <%= name %> — компонент модуля <%= module %>.
 */
export const <%= name %>: React.FC<<%= name %>Props> = ({ className }) => {
  return <div className={className} />;
};

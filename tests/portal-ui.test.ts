import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {it,expect} from "vitest";
import {Globe2} from "lucide-react";
import {StatusBadge,MetricCard,PageHeader,EmptyState,LoadingSkeleton} from "@/components/portal/PortalUI";
it("keeps accepted separate from delivered and uses text as well as color",()=>{
  const accepted=renderToStaticMarkup(createElement(StatusBadge,{value:"accepted"})),delivered=renderToStaticMarkup(createElement(StatusBadge,{value:"delivered"}));
  expect(accepted).toContain("p-badge-neutral");expect(accepted).not.toContain("delivered");expect(delivered).toContain("p-badge-positive");expect(delivered).toContain("delivered");
});
it("preserves real zero counts and doesn't invent counts for missing values",()=>{
  expect(renderToStaticMarkup(createElement(MetricCard,{title:"Domains",value:0,icon:Globe2,href:"/client-portal/domains"}))).toContain("<strong>0</strong>");
  expect(renderToStaticMarkup(createElement(MetricCard,{title:"Domains",value:undefined,icon:Globe2}))).toContain("Unavailable");
});
it("provides clear headings, empty and accessible loading states",()=>{
  expect(renderToStaticMarkup(createElement(PageHeader,{title:"Operations"}))).toContain("<h1>Operations</h1>");
  expect(renderToStaticMarkup(createElement(EmptyState,{title:"No records"}))).toContain("No records");
  expect(renderToStaticMarkup(createElement(LoadingSkeleton,{label:"Loading records"}))).toContain('aria-label="Loading records"');
});

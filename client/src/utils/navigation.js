// Only allow known in-app destinations; never redirect to a supplied external URL.
export function returnDestination(search) {
  const path = new URLSearchParams(search).get("returnTo") || "/";
  return /^(\/|\/account|\/courses|\/admin|\/course\/(?:study\/)?[a-f\d]{24})$/i.test(path)
    ? path : "/";
}
export function authLink(path, destination) {
  return `${path}?returnTo=${encodeURIComponent(destination)}`;
}

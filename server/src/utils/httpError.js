export function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

export function assertId(value, label = "ID") {
  if (typeof value !== "string" || !/^[a-f\d]{24}$/i.test(value)) {
    throw httpError(400, `Invalid ${label}`);
  }
}

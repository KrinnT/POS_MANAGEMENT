export function posSuccess<T>(data: T, init?: ResponseInit) {
  return Response.json(
    {
      success: true,
      data,
      meta: {
        serverTime: new Date().toISOString(),
      },
    },
    init,
  );
}

export function posError(code: string, message: string, status: number, details?: unknown) {
  return Response.json(
    {
      success: false,
      error: { code, message, details: details ?? null },
      meta: { serverTime: new Date().toISOString() },
    },
    { status },
  );
}

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${input}`, {
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    ...init,
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "message" in data && typeof data.message === "string"
        ? data.message
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export const api = {
  get<T>(input: string) {
    return request<T>(input);
  },
  post<T>(input: string, body: unknown) {
    return request<T>(input, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  put<T>(input: string, body: unknown) {
    return request<T>(input, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },
  delete<T>(input: string) {
    return request<T>(input, {
      method: "DELETE",
    });
  },
};

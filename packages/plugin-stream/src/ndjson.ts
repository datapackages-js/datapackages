export async function* streamNDJSON<T>(url: string): AsyncIterable<T> {
  const response = await fetch(url);
  if (!response.body) {
    throw new Error("Response body is null");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let remainder = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = remainder + decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");
      remainder = lines.pop() || "";

      for (const line of lines) {
        if (line.trim()) {
          yield JSON.parse(line) as T;
        }
      }
    }

    if (remainder.trim()) {
      yield JSON.parse(remainder) as T;
    }
  } finally {
    reader.releaseLock();
  }
}

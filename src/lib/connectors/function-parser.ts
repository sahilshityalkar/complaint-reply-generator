export function parseFunctionCalls(
  text: string
): Array<{ name: string; params: Record<string, string> }> {
  const calls: Array<{ name: string; params: Record<string, string> }> = [];
  const regex = /<function_call>(\w+)\(([^)]*)\)<\/function_call>/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    const name = match[1];
    const params: Record<string, string> = {};
    const paramRegex = /(\w+)\s*=\s*"([^"]*)"/g;
    let pm;
    while ((pm = paramRegex.exec(match[2])) !== null) {
      params[pm[1]] = pm[2];
    }
    calls.push({ name, params });
  }

  return calls;
}

export function stripFunctionCalls(text: string): string {
  return text.replace(
    /<function_call>.*?<\/function_call>/g,
    ""
  ).trim();
}

import process from "node:process";

async function main() {
  const input = await new Promise<string>((resolve, reject) => {
    let value = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (value += chunk));
    process.stdin.on("end", () => resolve(value));
    process.stdin.on("error", reject);
  });
  const [companyName, orgNumber, firstName, lastName, email, password] = input
    .replace(/\r/g, "")
    .split("\n");
  if (!companyName || !firstName || !lastName || !email || !password) {
    throw new Error("Mangler opplysninger for første administrator.");
  }
  const response = await fetch("http://127.0.0.1:4000/api/setup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      companyName,
      orgNumber: orgNumber || undefined,
      firstName,
      lastName,
      email,
      password,
    }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(
      body.message ?? `Oppsett feilet med HTTP ${response.status}.`,
    );
  }
  console.log("Første administrator er opprettet. Oppsettet er nå lukket.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

from openai import OpenAI
from app.config import settings

client = OpenAI(api_key=settings.OPENAI_API_KEY)

SYSTEM_PROMPT = """
You are an expert in Playwright automation. Convert the user's natural language instruction into a single JavaScript function that uses Playwright (v1.40) with async/await. 
The function should be named `run(page)` and receive a Playwright page object. 
Assume necessary imports are already present. 
Only output the code, no explanations. 
Example:
Instruction: "Go to google.com and search for 'weather'"
Output:
async function run(page) {
    await page.goto('https://google.com');
    await page.locator('textarea[name="q"]').fill('weather');
    await page.locator('input[type="submit"]').click();
    await page.waitForTimeout(2000);
}
"""

def generate_script(instruction: str) -> str:
        """Generate a Playwright automation script from natural language instruction."""
        response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": instruction}
                ],
                temperature=0.1,
        )
        return response.choices[0].message.content
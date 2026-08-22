import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ locals }) => {
    try {
        const session = locals.session;
        if (!session?.access_token) {
            return json({ error: "Unauthorized" }, { status: 401 });
        }

        const response = await fetch("http://localhost:8000/api/packages/list", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${session.access_token}`,
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();
        return json(data, { status: response.status });
    } catch (error) {
        console.error("Error fetching packages:", error);
        return json({ error: "Failed to fetch packages" }, { status: 500 });
    }
};

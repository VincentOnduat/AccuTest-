import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ params, locals }) => {
    const { id } = params;
    
    try {
        const session = locals.session;
        if (!session?.access_token) {
            return json({ error: "Unauthorized" }, { status: 401 });
        }

        const response = await fetch(`http://localhost:8000/api/packages/id/${id}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${session.access_token}`,
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();
        return json(data, { status: response.status });
    } catch (error) {
        console.error("Error fetching package:", error);
        return json({ error: "Failed to fetch package" }, { status: 500 });
    }
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
    const { id } = params;
    
    try {
        const session = locals.session;
        if (!session?.access_token) {
            return json({ error: "Unauthorized" }, { status: 401 });
        }

        const response = await fetch(`http://localhost:8000/api/packages/id/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${session.access_token}`,
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();
        return json(data, { status: response.status });
    } catch (error) {
        console.error("Error deleting package:", error);
        return json({ error: "Failed to delete package" }, { status: 500 });
    }
};

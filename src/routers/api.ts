import express, { json } from "express";
import { updateCache } from "../index";

export const api = express.Router();

api.post("/generate", json(), async (req, res) => {
    const params = req.body;
    if (!params.url || !params.title || !params.type) {
        return res.status(400).json({ error: "bad request" });
    }

    const cleanUrl = params.url.replace(/[^a-zA-Z ]/g, "").replace(/\s+/g, "-");
    const randString = Math.random().toString(16).substring(2, 10);
    const finalUrl = `${cleanUrl}-${randString}`;

    await updateCache(finalUrl, params);
    return res.json({ url: finalUrl });
});

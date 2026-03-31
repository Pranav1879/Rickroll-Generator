import * as mongoDB from "mongodb";
import * as path from "path";
import express, { json, Request, Response } from "express";
import { isbot } from "isbot";
import { api } from "./routers/api";
import { config } from "dotenv";

config();
const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "public", "html"));
app.use(express.static(path.join(process.cwd(), "public")));
app.use("/api", api);

let PORT = parseInt(process.env.PORT || "3000", 10);
let collection: mongoDB.Collection;

const setup = async () => {
    const URL = process.env.mongourl;
    if (!URL) throw new Error("mongourl not found");
    const client = new mongoDB.MongoClient(URL);
    await client.connect();
    collection = client.db("main").collection("rickroll");
    console.log("🚀 DATABASE CONNECTED SUCCESSFULLY");
};

app.get("/", async (req, res) => {
    const result = await collection.findOne({ _id: new mongoDB.ObjectId("TotalRRCount") });
    res.render("index", { count: result ? result.value : 0 });
});

app.get(["/posts/:url", "/news/:url", "/blogs/:url"], async (req, res) => {
    const result = await collection.findOne({ link: req.params.url });
    if (!result) return res.status(404).send("<h1>Link not found!</h1><p>Wait 5 seconds and refresh. The database might be slow.</p>");
    
    if (!isbot(req.headers["user-agent"])) {
        await collection.updateOne({ _id: new mongoDB.ObjectId("TotalRRCount") }, { $inc: { value: 1 } });
        await collection.updateOne({ link: req.params.url }, { $inc: { value: 1 } });
    }

    res.render("_rickroll", { 
        title: result.title, 
        description: result.description, 
        ImgUrl: result.ImgUrl || "https://picsum.photos/id/1015/1200/600", 
        text: result.author ? `${result.author} rickrolled you!` : "Get Rickrolled!" 
    });
});

export const updateCache = async (url: string, params: any) => {
    const expiry = parseInt(params.expiry) || 7;
    const expireAt = new Date(Date.now() + expiry * 24 * 60 * 60 * 1000);
    await collection.insertOne({
        link: url,
        title: params.title,
        description: params.description,
        type: params.type,
        author: params.author || null,
        ImgUrl: params.ImgUrl || null,
        value: 0,
        expireAt: expireAt
    });
};

setup().then(() => {
    app.listen(PORT, "0.0.0.0", () => console.log(`✅ SERVER LIVE ON PORT ${PORT}`));
});

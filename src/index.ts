import * as mongoDB from "mongodb";
import * as path from "path";
import express, {
	json, Request, Response, NextFunction
} from "express";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { config } from "dotenv";
import { isbot } from "isbot";
import { api } from "./routers/api";

config();

const app = express();
const topLevelRickrollPaths = ["/posts/:url", "/news/:url", "/blogs/:url"];

app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "public", "html"));
app.use(express.static(path.join(process.cwd(), "public")));
app.use("/api", api);

let PORT: number;
let mongoClient: mongoDB.MongoClient;
let collection: mongoDB.Collection;
export const info: any = {};

const setup = async () => {
	const URL = process.env.mongourl;
	PORT = parseInt(process.env.PORT || process.env.port || "3000", 10);

	if (!URL) throw new Error("Env file not configured properly. 'mongourl' not found.");
	mongoClient = new mongoDB.MongoClient(URL);
	await mongoClient.connect();
	await mongoClient.db("main").command({ ping: 1 });
	console.log("Connected successfully to db and fetched main collection.");

	const database = mongoClient.db("main");
	collection = database.collection("rickroll");
};

app.get("/", async (req: Request, res: Response) => {
	const result = await collection.findOne({ _id: new mongoDB.ObjectId("TotalRRCount") });
	const count = result ? result.value : 0;
	res.render("index", { count });
});

app.get("/faq", (req: Request, res: Response) => {
	res.render("faq");
});

app.get("/usage", (req: Request, res: Response) => {
	res.render("usage");
});

app.get(topLevelRickrollPaths, async (req: Request, res: Response) => {
	const url = req.params.url;
	const result = await collection.findOne({ link: url });

	if (!result) {
		return res.status(404).render("404");
	}

	const { title, description, ImgUrl, author } = result;
	const incValue = { $inc: { value: 1 } };

	if (!isbot(req.headers["user-agent"])) {
		await collection.updateOne({ _id: new mongoDB.ObjectId("TotalRRCount") }, incValue);
		await collection.updateOne({ link: url }, incValue);
	}

	let text: string;
	if (author && typeof author === "string" && author.length > 0) {
		text = `${author} rickrolled you! haha`;
	} else {
		text = "Get rickrolled! haha";
	}

	res.render("_rickroll", { title, description, ImgUrl, text });
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const updateCache = (url: string, params: any) => {
	const cDateTime = new Date();
	const expiry = params.expiry || 7;
	const expireAt = new Date(cDateTime.getTime() + expiry * 24 * 60 * 60 * 1000);
	
	collection.insertOne({
		link: url,
		title: params.title,
		description: params.description,
		type: params.type,
		author: params.author,
		ImgUrl: params.ImgUrl,
		value: 0,
		expireAt: expireAt
	});
};

const serve = async () => {
	await setup().then(() => {
		app.listen(PORT, "0.0.0.0", () => {
			console.log(`Listening on port ${PORT}`);
		});
	}).catch(err => {
		console.error("Failed to connect to database", err);
	});
};

serve();

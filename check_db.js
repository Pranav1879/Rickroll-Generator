const { MongoClient } = require('mongodb');
require('dotenv').config();
async function run() {
    const client = new MongoClient(process.env.mongourl);
    await client.connect();
    const docs = await client.db("main").collection("rickroll").find({link: {$exists: true}}).sort({_id: -1}).limit(3).toArray();
    console.log("\n--- LAST 3 RICKROLLS IN DB ---");
    console.table(docs.map(d => ({ link: d.link, title: d.title })));
    process.exit();
}
run();

import mongoose from "mongoose";
import { check, hash, ObjectId, TABLES } from "./core.js";

const JOURNAL = "yogabliss_catalog_migrations";
export function identityFor(uri, database) {
  check(typeof uri === "string" && /^mongodb(?:\+srv)?:\/\//.test(uri), "MONGO_URI_REQUIRED");
  check(typeof database === "string" && /^[a-zA-Z0-9_-]+$/.test(database), "EXPLICIT_DATABASE_REQUIRED");
  const authority = uri.split("://")[1].split(/[/?]/)[0].split("@").at(-1).toLowerCase();
  return { database, deploymentFingerprint: hash(authority.split(",").sort()) };
}
export async function connect(uri, database) {
  const identity = identityFor(uri, database);
  const client = new mongoose.mongo.MongoClient(uri, { serverSelectionTimeoutMS: 10000, appName: "YogaBlissMigration", retryWrites: false, promoteLongs: false });
  await client.connect();
  const db = client.db(database);
  const indexes = async () => {
    const result = {};
    for (const name of TABLES) {
      try { result[name] = await db.collection(name).listIndexes().toArray(); }
      catch (error) { if (error.code === 26) result[name] = []; else throw error; }
    }
    return result;
  };
  async function read(session, knownIndexes) {
    const result = { identity, indexes: knownIndexes || await indexes() };
    for (const name of [...TABLES, JOURNAL]) {
      const rows = await db.collection(name).find({}, { session }).limit(100001).toArray();
      check(rows.length <= 100000, "INVENTORY_TOO_LARGE_REQUIRES_SCOPED_REVIEW");
      result[name === JOURNAL ? "journals" : name] = rows;
    }
    return result;
  }
  return {
    identity, read: () => read(), close: () => client.close(),
    async transaction(work) {
      const hello = await db.command({ hello: 1 });
      check(Boolean(hello.setName || hello.msg === "isdbgrid"), "TRANSACTION_SUPPORT_REQUIRED");
      const knownIndexes = await indexes();
      const session = client.startSession();
      try {
        return await session.withTransaction(async () => work({
          read: () => read(session, knownIndexes),
          async replace(table, rows) {
            check(["courses", "progresses"].includes(table), "WRITE_SCOPE_VIOLATION");
            for (const row of rows) {
              const result = await db.collection(table).replaceOne({ _id: row._id }, row, { session });
              check(result.matchedCount === 1, "DOCUMENT_DISAPPEARED");
            }
          },
          async insert(table, rows) {
            check(table === "lectures" && rows.length > 0, "WRITE_SCOPE_VIOLATION");
            await db.collection(table).insertMany(rows, { session, ordered: true });
          },
          async remove(table, ids) {
            check(table === "lectures" && [6, 9].includes(ids.length), "WRITE_SCOPE_VIOLATION");
            const result = await db.collection(table).deleteMany({ _id: { $in: ids.map((i) => new ObjectId(i)) } }, { session });
            check(result.deletedCount === ids.length, "LECTURE_SET_CHANGED");
          },
          journal: (record) => db.collection(JOURNAL).replaceOne({ _id: record._id }, record, { upsert: true, session }),
        }), { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" }, readPreference: "primary" });
      } finally { await session.endSession(); }
    },
  };
}

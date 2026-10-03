import test from "node:test";
import assert from "node:assert/strict";
import { seedAccounts } from "../src/seed/accounts.js";

const config = () => ({
  SEED_ADMIN_EMAIL: " Admin@example.test ",
  SEED_ADMIN_PASSWORD: "test-only-admin-password",
  SEED_LEARNER_EMAIL: "learner@example.test",
  SEED_LEARNER_PASSWORD: "test-only-learner-password",
});

test("local seed accounts use configuration and generic defaults", () => {
  const accounts = seedAccounts(config());
  assert.equal(accounts[0].email, "admin@example.test");
  assert.equal(accounts[0].name, "Local admin");
  assert.equal(accounts[0].role, "admin");
  assert.equal(accounts[1].name, "Local learner");
  assert.equal(accounts[1].role, "user");
  assert.equal(accounts[1].password, config().SEED_LEARNER_PASSWORD);
  assert.equal(seedAccounts({ ...config(), SEED_LEARNER_NAME: " Custom learner " })[1].name, "Custom learner");
});

test("both local accounts must validate before seeding can begin", () => {
  for (const key of Object.keys(config())) {
    assert.throws(() => seedAccounts({ ...config(), [key]: "" }), /Configure/);
  }
  assert.throws(() => seedAccounts({ ...config(), SEED_LEARNER_PASSWORD: "short" }), /Configure/);
  assert.throws(() => seedAccounts({ ...config(), SEED_ADMIN_NAME: " " }), /Configure/);
  assert.throws(() => seedAccounts({ ...config(), SEED_LEARNER_NAME: "x".repeat(81) }), /Configure/);
  assert.throws(() => seedAccounts({ ...config(), SEED_LEARNER_EMAIL: "ADMIN@example.test" }), /must differ/);
});

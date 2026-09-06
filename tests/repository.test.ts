import { beforeEach, describe, it, expect } from "vitest";
import {
  localRepository,
  LOCAL_KEY,
  ConflictError,
} from "../src/services/repository";
import { coffeeExample } from "../src/domain/decision";
import { exportJSON } from "../src/domain/portability";
const values = new Map<string, string>();
const localStorage: Storage = {
  get length() {
    return values.size;
  },
  clear: () => values.clear(),
  getItem: (k) => values.get(k) ?? null,
  setItem: (k, v) => {
    values.set(k, String(v));
  },
  removeItem: (k) => {
    values.delete(k);
  },
  key: (i) => [...values.keys()][i] ?? null,
};
beforeEach(() => localStorage.clear());
describe("guest persistence", () => {
  it("saves and reloads without creating duplicates", async () => {
    const repo = localRepository(localStorage);
    const first = await repo.save(coffeeExample());
    const second = await repo.save({ ...first, need: "Better mornings" });
    expect(second.revision).toBe(2);
    expect(await repo.list()).toEqual([second]);
  });
  it("blocks stale updates and deletes across tabs", async () => {
    const a = localRepository(localStorage),
      b = localRepository(localStorage);
    const first = await a.save(coffeeExample());
    await b.save({ ...first, usesPerWeek: 1 });
    await expect(a.save(first)).rejects.toBeInstanceOf(ConflictError);
    await expect(a.remove(first)).rejects.toBeInstanceOf(ConflictError);
    expect((await a.list())[0].usesPerWeek).toBe(1);
  });
  it("retains the original legacy data and stable migrated IDs", async () => {
    const raw = JSON.stringify([
      {
        id: "legacy",
        name: "Camera",
        price: 900,
        lifespanYears: 5,
        usesPerWeek: 2,
        minutesPerUse: 30,
        depreciationRatePercent: 10,
      },
    ]);
    localStorage.setItem("purchaseValueItems", raw);
    const repo = localRepository(localStorage);
    const first = await repo.list();
    expect(await repo.list()).toEqual(first);
    expect(localStorage.getItem("purchaseValueItems")).toBe(raw);
    expect(localStorage.getItem(LOCAL_KEY)).toBeTruthy();
  });
  it("never overwrites matching imports", async () => {
    const repo = localRepository(localStorage);
    const saved = await repo.save(coffeeExample());
    await repo.importAll([{ ...saved, usesPerWeek: 99 }]);
    expect(await repo.list()).toEqual([saved]);
  });
  it("keeps corrupt originals intact instead of silently resetting", async () => {
    localStorage.setItem(LOCAL_KEY, "bad json");
    await expect(localRepository(localStorage).list()).rejects.toThrow();
    expect(localStorage.getItem(LOCAL_KEY)).toBe("bad json");
  });
  it("deletes only the selected decision", async () => {
    const repo = localRepository(localStorage);
    const a = await repo.save(coffeeExample()),
      b = await repo.save(coffeeExample());
    await repo.remove(a);
    expect(await repo.list()).toEqual([b]);
  });
  it("rejects an over-capacity import atomically", async () => {
    const original = Array.from({ length: 200 }, () => coffeeExample());
    localStorage.setItem(LOCAL_KEY, exportJSON(original));
    await expect(
      localRepository(localStorage).importAll([coffeeExample()]),
    ).rejects.toThrow();
    expect(await localRepository(localStorage).list()).toEqual(original);
  });
});

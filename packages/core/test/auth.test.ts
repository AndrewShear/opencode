import { describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { FSUtil } from "@opencode-ai/core/fs-util"
import { Global } from "@opencode-ai/core/global"
import { Auth } from "@opencode-ai/core/auth"
import { tmpdir } from "./fixture/tmpdir"
import { TestConsole } from "effect/testing"

const withAuth = <A, E>(dir: string, effect: Effect.Effect<A, E, Auth.Service>) =>
  effect.pipe(
    Effect.provide(Auth.layer),
    Effect.provide(FSUtil.defaultLayer),
    Effect.provide(Global.layerWith({ data: dir })),
  )

describe("Auth", () => {
  test("stores api credentials", async () => {
    const effect = Effect.gen(function* () {
      const tmp = yield* Effect.acquireRelease(
        Effect.promise(() => tmpdir()),
        (tmp) => Effect.promise(() => tmp[Symbol.asyncDispose]()),
      )

      const account = yield* withAuth(
        tmp.path,
        Effect.gen(function* () {
          const auth = yield* Auth.Service
          return yield* auth.create({
            serviceID: Auth.ServiceID.make("anthropic"),
            credential: new Auth.ApiKeyCredential({ type: "api", key: "sk-test" }),
          })
        }),
      )

      const active = yield* withAuth(
        tmp.path,
        Effect.gen(function* () {
          const auth = yield* Auth.Service
          return yield* auth.active(Auth.ServiceID.make("anthropic"))
        }),
      )

      expect(account).toBeDefined()
      if (!account) return
      expect(active?.id).toBe(account.id)
      expect(active?.credential).toEqual({ type: "api", key: "sk-test" })
    }).pipe(Effect.provide(TestConsole.layer))

    await Effect.runPromise(Effect.scoped(effect as Effect.Effect<void, Auth.FileWriteError, never>))
  })
})

# Purchase Assistant direction

The product should turn a moment of purchase interest into a clear decision, then learn from what happened. A photo or product link should be enough to begin; the user should only need to supply the details that materially affect their choice.

## The distinctive experience

Someone photographs a £600 coffee machine. The assistant identifies the visible product and price, asks how many café visits it will replace, and builds a short decision brief. The ownership model shows the effect of consumables, maintenance and realistic usage. Research adds evidence about the specific variant and alternatives. The person can change any assumption, inspect a source, defer or record the purchase.

A later check-in records 2 uses a week against an original forecast of 4. On a future home-equipment decision, the product surfaces that observation without pretending that one purchase predicts the next. This gives the product useful memory with an understandable basis.

## What the current build establishes

One saved brief now connects capture, editable scenarios, source-backed research and outcomes. Vision extracts explicit facts; a language model plans bounded searches and summarises their results. Deterministic code owns the arithmetic. The user controls what becomes part of the saved decision.

The first release uses the existing React, Supabase and Venice stack. One small orchestration service is sufficient. A larger agent framework would add cost and failure modes before there is evidence that this workflow needs it.

## Where to be more ambitious next

1. **Make the first minute much better.** Evaluate real shelf photos and product screenshots; improve variant recognition, ask only unanswered questions and use confidence to request clarification rather than invent a number.
2. **Make alternatives practical.** Research a relevant used, repair, rental or keep-existing option with source-backed details. Let the user explicitly turn a discovered alternative into a candidate. Validate seller coverage before promising universal shopping search.
3. **Make personal memory useful.** Use a few observed outcomes to challenge an assumption with a quoted, inspectable basis. Let the user correct or exclude memories. Require enough observations before making aggregate claims.
4. **Test selective follow-up.** Offer a user-chosen check-in date after buying. Build consent, timezone and delivery handling before scheduling notifications. There is no reminder system in the current release.

## Commercial judgement

Start with durable products where a mistaken choice is costly enough to justify a few minutes of thought. Do not try to cover groceries, investments, vehicles and every online marketplace in the first pilot.

The likely paid value is better evidence and saved personal context around occasional important decisions. A small research allowance or paid decision pack may fit that usage better than a subscription. That is a hypothesis to test, not a pricing commitment. Measure provider costs and willingness to pay before adding billing.

Affiliate commission would create an incentive to push purchases and favour merchants. Keep ranking independent of commercial relationships and disclose any eventual referral arrangement. The strongest trust signal is a product willing to recommend waiting, repairing or buying nothing when the evidence supports it.

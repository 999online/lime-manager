# Lime Manager Node SDK + CLI

Internal Node SDK and CLI for Lime Manager's public API (`/public/v1/*`).

## SDK usage

```typescript
import LimeManager from '@lime-manager/sdk';

const client = new LimeManager('your-api-key', 'http://localhost:3000');
```

Available methods:
- `post(posts: CreatePostDto)` - Schedule a post
- `postList(filters: GetPostsDto)` - Get a list of posts
- `upload(file: Buffer, extension: string)` - Upload a file
- `integrations()` - Get a list of connected channels
- `deletePost(id: string)` - Delete a post by ID

The API key comes from Settings > Developer/API in the app (organization-scoped).

## CLI usage

After building (`pnpm --filter ./apps/sdk run build`), the `lime-manager` binary
is available via `node apps/sdk/dist/cli.js` (or link it onto your PATH).

```bash
# Store credentials locally (~/.lime-manager/config.json, mode 0600)
lime-manager login --api-key <key> --api-url http://localhost:3000

# List connected channels
lime-manager integrations

# List posts in a date range
lime-manager posts --start 2026-07-01T00:00:00.000Z --end 2026-07-31T00:00:00.000Z

# Create/schedule a post from a JSON file matching CreatePostDto
lime-manager create-post --file ./post.json

# ...or an inline JSON string
lime-manager create-post --json '{"type":"now","posts":[...]}'

# Delete a post
lime-manager delete-post <id>
```

Example `post.json` payload (one integration, one content block, no media):

```json
{
  "type": "now",
  "posts": [
    {
      "integration": { "id": "<integration-id from `lime-manager integrations`>" },
      "value": [{ "content": "Hello from the CLI", "image": [] }]
    }
  ]
}
```

`type` is `"now"`, `"schedule"` (add a top-level `date` ISO string), or `"draft"`.
Per-provider `settings` may be required depending on the integration — see
`GET /public/v1/integration-settings/:id` for that provider's schema.

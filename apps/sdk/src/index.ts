import { CreatePostDto } from '@gitroom/nestjs-libraries/dtos/posts/create.post.dto';
import { GetPostsDto } from '@gitroom/nestjs-libraries/dtos/posts/get.posts.dto';
import fetch, { FormData } from 'node-fetch';

function toQueryString(obj: Record<string, any>): string {
  const params = new URLSearchParams();
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  return params.toString();
}

export class LimeManagerApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(
      `Lime Manager API request failed with status ${status}: ${JSON.stringify(body)}`
    );
    this.name = 'LimeManagerApiError';
  }
}

// node-fetch resolves on any HTTP status, including 4xx/5xx — none of these
// calls checked response.ok, so an API-level rejection (bad request, auth
// failure, validation error) silently returned the error body as if it were
// a successful result. Any caller scripting against this SDK/CLI would see
// a normal resolved promise / exit code 0 even when the request failed.
async function parseOrThrow(response: import('node-fetch').Response) {
  const body = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new LimeManagerApiError(response.status, body);
  }
  return body;
}

export default class LimeManager {
  constructor(
    private _apiKey: string,
    private _path = process.env.LIME_MANAGER_API_URL || 'http://localhost:3000'
  ) {}

  async post(posts: CreatePostDto) {
    return parseOrThrow(
      await fetch(`${this._path}/public/v1/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this._apiKey,
        },
        body: JSON.stringify(posts),
      })
    );
  }

  async postList(filters: GetPostsDto) {
    return parseOrThrow(
      await fetch(`${this._path}/public/v1/posts?${toQueryString(filters)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this._apiKey,
        },
      })
    );
  }

  async upload(file: Buffer, extension: string) {
    const formData = new FormData();
    const type =
      extension === 'png'
        ? 'image/png'
        : extension === 'jpg'
        ? 'image/jpeg'
        : extension === 'gif'
        ? 'image/gif'
        : extension === 'jpeg'
        ? 'image/jpeg'
        : 'image/jpeg';

    const blob = new Blob([file], { type });
    formData.append('file', blob, extension);

    return parseOrThrow(
      await fetch(`${this._path}/public/v1/upload`, {
        method: 'POST',
        // @ts-ignore
        body: formData,
        headers: {
          Authorization: this._apiKey,
        },
      })
    );
  }

  async integrations() {
    return parseOrThrow(
      await fetch(`${this._path}/public/v1/integrations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this._apiKey,
        },
      })
    );
  }

  async deletePost(id: string) {
    return parseOrThrow(
      await fetch(`${this._path}/public/v1/posts/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this._apiKey,
        },
      })
    );
  }
}

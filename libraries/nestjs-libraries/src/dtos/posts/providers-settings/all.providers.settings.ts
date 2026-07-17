import { RedditSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/reddit.dto';
import { YoutubeSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/youtube.settings.dto';
import { XDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/x.dto';
import { InstagramDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/instagram.dto';
import { LinkedinDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/linkedin.dto';
import { IsIn } from 'class-validator';
import { FacebookDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/facebook.dto';

export type ProviderExtension<T extends string, M> = { __type: T } & M;
export type AllProvidersSettings =
  | ProviderExtension<'reddit', RedditSettingsDto>
  | ProviderExtension<'youtube', YoutubeSettingsDto>
  | ProviderExtension<'x', XDto>
  | ProviderExtension<'linkedin', LinkedinDto>
  | ProviderExtension<'linkedin-page', LinkedinDto>
  | ProviderExtension<'instagram', InstagramDto>
  | ProviderExtension<'instagram-standalone', InstagramDto>
  | ProviderExtension<'facebook', FacebookDto>;

type None = NonNullable<unknown>;

export const allProviders = (setEmpty?: any) => {
  return [
    { value: RedditSettingsDto, name: 'reddit' },
    { value: YoutubeSettingsDto, name: 'youtube' },
    { value: XDto, name: 'x' },
    { value: LinkedinDto, name: 'linkedin' },
    { value: LinkedinDto, name: 'linkedin-page' },
    { value: InstagramDto, name: 'instagram' },
    { value: InstagramDto, name: 'instagram-standalone' },
    { value: FacebookDto, name: 'facebook' },
  ].filter((f) => f.value);
};

export class EmptySettings {
  @IsIn(allProviders(EmptySettings).map((p) => p.name), {
    message: `"__type" must be ${allProviders(EmptySettings)
      .map((p) => p.name)
      .join(', ')}`,
  })
  __type: string;
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import { WebhooksService } from '@gitroom/nestjs-libraries/database/prisma/webhooks/webhooks.service';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import {
  OnlyURL, UpdateDto, WebhooksDto
} from '@gitroom/nestjs-libraries/dtos/webhooks/webhooks.dto';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { isSafePublicHttpsUrl } from '@gitroom/nestjs-libraries/dtos/webhooks/webhook.url.validator';
import { getSsrfSafeDispatcher } from '@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher';

@ApiTags('Webhooks')
@Controller('/webhooks')
export class WebhookController {
  constructor(private _webhooksService: WebhooksService) {}

  @Get('/')
  async getStatistics(@GetOrgFromRequest() org: Organization) {
    return this._webhooksService.getWebhooks(org.id);
  }

  @Post('/')
  @CheckPolicies([AuthorizationActions.Create, Sections.WEBHOOKS])
  async createAWebhook(
    @GetOrgFromRequest() org: Organization,
    @Body() body: WebhooksDto
  ) {
    return this._webhooksService.createWebhook(org.id, body);
  }

  @Put('/')
  async updateWebhook(
    @GetOrgFromRequest() org: Organization,
    @Body() body: UpdateDto
  ) {
    return this._webhooksService.createWebhook(org.id, body);
  }

  @Delete('/:id')
  async deleteWebhook(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._webhooksService.deleteWebhook(org.id, id);
  }

  @Post('/send')
  async sendWebhook(@Body() body: any, @Query() query: OnlyURL) {
    try {
      // OnlyURL's DTO validation only runs once at request-parse time —
      // re-check immediately before the fetch to close the TOCTOU window
      // (DNS rebinding / open redirect) between validation and delivery.
      if (!(await isSafePublicHttpsUrl(query.url))) {
        return { send: false };
      }
      await fetch(query.url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
        redirect: 'manual',
        // @ts-ignore — undici-specific option, not in lib.dom fetch types
        dispatcher: getSsrfSafeDispatcher(),
      });
    } catch (err) {
      /** sent **/
    }

    return { send: true };
  }
}

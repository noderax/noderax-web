"use client";

import { useMemo, useState } from "react";
import { Globe2, Shield } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionPanel } from "@/components/ui/section-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateOidcProvider,
  useDeleteOidcProvider,
  useOidcProviders,
  useTestOidcProvider,
  useUpdateOidcProvider,
} from "@/lib/hooks/use-noderax-data";

type ProviderPreset = "custom" | "google" | "microsoft";

const createDefaultDraft = () => ({
  slug: "",
  name: "",
  preset: "custom" as ProviderPreset,
  issuer: "",
  discoveryUrl: "",
  clientId: "",
  clientSecret: "",
  scopesText: "openid email profile",
  enabled: true,
});

export const PlatformIdentityPanel = () => {
  const oidcProvidersQuery = useOidcProviders();
  const createOidcProvider = useCreateOidcProvider();
  const updateOidcProvider = useUpdateOidcProvider();
  const deleteOidcProvider = useDeleteOidcProvider();
  const testOidcProvider = useTestOidcProvider();
  const [draft, setDraft] = useState(createDefaultDraft);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [testSummary, setTestSummary] = useState<string | null>(null);

  const providers = oidcProvidersQuery.data ?? [];
  const enabledProviders = providers.filter((provider) => provider.enabled).length;
  const normalizedScopes = useMemo(
    () =>
      draft.scopesText
        .split(/[\s,]+/g)
        .map((scope) => scope.trim())
        .filter(Boolean),
    [draft.scopesText],
  );

  const resetDraft = () => {
    setDraft(createDefaultDraft());
    setEditingProviderId(null);
    setTestSummary(null);
  };

  const saveProvider = async () => {
    try {
      const payload = {
        slug: draft.slug.trim(),
        name: draft.name.trim(),
        preset: draft.preset === "custom" ? undefined : draft.preset,
        issuer: draft.issuer.trim(),
        discoveryUrl: draft.discoveryUrl.trim(),
        clientId: draft.clientId.trim(),
        clientSecret: draft.clientSecret.trim() || undefined,
        scopes: normalizedScopes,
        enabled: draft.enabled,
      };

      if (editingProviderId) {
        await updateOidcProvider.mutateAsync({
          providerId: editingProviderId,
          payload,
        });
      } else {
        await createOidcProvider.mutateAsync(payload);
      }

      resetDraft();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save SSO provider.");
    }
  };

  const testProvider = async () => {
    try {
      const result = await testOidcProvider.mutateAsync({
        preset: draft.preset === "custom" ? undefined : draft.preset,
        issuer: draft.issuer.trim(),
        discoveryUrl: draft.discoveryUrl.trim(),
        clientId: draft.clientId.trim(),
        clientSecret: draft.clientSecret.trim() || undefined,
        scopes: normalizedScopes,
        enabled: draft.enabled,
      });
      setTestSummary(
        `${result.issuer} • auth ${result.authorizationEndpoint} • token ${result.tokenEndpoint}`,
      );
      toast.success("SSO provider connectivity verified");
    } catch (error) {
      setTestSummary(
        error instanceof Error ? error.message : "OIDC provider test failed.",
      );
      toast.error(error instanceof Error ? error.message : "OIDC provider test failed.");
    }
  };

  return (
    <SectionPanel
      eyebrow="Identity"
      title="Single sign-on providers"
      description="Manage external OIDC identity providers used for platform login. Existing active users are linked by verified email."
      contentClassName="space-y-6"
    >
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="rounded-full px-3 py-1">
          Providers: {providers.length}
        </Badge>
        <Badge variant="outline" className="rounded-full px-3 py-1">
          Enabled: {enabledProviders}
        </Badge>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          {oidcProvidersQuery.isError ? (
            <div className="rounded-[20px] border px-4 py-4 text-sm text-tone-danger">
              OIDC providers could not be loaded.
            </div>
          ) : !oidcProvidersQuery.isPending && providers.length === 0 ? (
            <div className="rounded-[20px] border px-4 py-4 text-sm text-muted-foreground">
              No SSO providers configured yet.
            </div>
          ) : (
            providers.map((provider) => (
              <div key={provider.id} className="rounded-[20px] border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{provider.name}</p>
                      <Badge variant="outline" className="rounded-full px-2.5 py-1">
                        {provider.slug}
                      </Badge>
                      {provider.enabled ? (
                        <Badge className="rounded-full px-2.5 py-1">
                          Enabled
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="rounded-full px-2.5 py-1">
                          Disabled
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {provider.discoveryUrl}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Scopes: {provider.scopes.join(", ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingProviderId(provider.id);
                        setDraft({
                          slug: provider.slug,
                          name: provider.name,
                          preset:
                            provider.preset === "google" || provider.preset === "microsoft"
                              ? provider.preset
                              : "custom",
                          issuer: provider.issuer,
                          discoveryUrl: provider.discoveryUrl,
                          clientId: provider.clientId,
                          clientSecret: "",
                          scopesText: provider.scopes.join(" "),
                          enabled: provider.enabled,
                        });
                        setTestSummary(null);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={deleteOidcProvider.isPending}
                      onClick={() => deleteOidcProvider.mutate(provider.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-4 rounded-[20px] border p-4">
          <div className="flex items-start gap-3">
            <div className="tone-brand flex size-11 items-center justify-center rounded-full border">
              <Globe2 className="size-4.5" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">
                {editingProviderId ? "Edit SSO provider" : "Create SSO provider"}
              </p>
              <p className="text-sm text-muted-foreground">
                Google and Microsoft presets can pre-label the provider, while custom mode supports any OIDC discovery endpoint.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="oidc-provider-name">Provider name</Label>
              <Input
                id="oidc-provider-name"
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Google Workspace"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oidc-provider-slug">Slug</Label>
              <Input
                id="oidc-provider-slug"
                value={draft.slug}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    slug: event.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]+/g, "-")
                      .replace(/^-+|-+$/g, ""),
                  }))
                }
                placeholder="google"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oidc-provider-preset">Preset</Label>
              <Select
                value={draft.preset}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    preset: (value ?? "custom") as ProviderPreset,
                  }))
                }
              >
                <SelectTrigger id="oidc-provider-preset">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="microsoft">Microsoft</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="oidc-provider-client-id">Client ID</Label>
              <Input
                id="oidc-provider-client-id"
                value={draft.clientId}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    clientId: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="oidc-provider-client-secret">Client secret</Label>
              <Input
                id="oidc-provider-client-secret"
                type="password"
                value={draft.clientSecret}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    clientSecret: event.target.value,
                  }))
                }
                placeholder={
                  editingProviderId ? "Leave blank to keep the existing secret" : ""
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="oidc-provider-issuer">Issuer</Label>
              <Input
                id="oidc-provider-issuer"
                value={draft.issuer}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    issuer: event.target.value,
                  }))
                }
                placeholder="https://accounts.google.com"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="oidc-provider-discovery-url">Discovery URL</Label>
              <Input
                id="oidc-provider-discovery-url"
                value={draft.discoveryUrl}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    discoveryUrl: event.target.value,
                  }))
                }
                placeholder="https://accounts.google.com/.well-known/openid-configuration"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="oidc-provider-scopes">Scopes</Label>
              <Textarea
                id="oidc-provider-scopes"
                className="min-h-20"
                value={draft.scopesText}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    scopesText: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-[18px] border px-4 py-3">
            <div>
              <p className="font-medium">Provider enabled</p>
              <p className="text-sm text-muted-foreground">
                Enabled providers are displayed on the login screen.
              </p>
            </div>
            <Switch
              checked={draft.enabled}
              onCheckedChange={(checked) =>
                setDraft((current) => ({ ...current, enabled: checked }))
              }
            />
          </div>

          {testSummary ? (
            <div className="rounded-[18px] border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              {testSummary}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={testOidcProvider.isPending}
              onClick={() => void testProvider()}
            >
              {testOidcProvider.isPending ? "Testing..." : "Test provider"}
            </Button>
            <Button
              type="button"
              disabled={createOidcProvider.isPending || updateOidcProvider.isPending}
              onClick={() => void saveProvider()}
            >
              <Shield className="size-4" />
              {editingProviderId ? "Save provider" : "Create provider"}
            </Button>
            {editingProviderId ? (
              <Button type="button" variant="ghost" onClick={resetDraft}>
                Cancel edit
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </SectionPanel>
  );
};

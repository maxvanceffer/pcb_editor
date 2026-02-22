<template>
    <div class="min-h-screen flex items-center justify-center bg-background">
        <!-- Переключалки языка и темы -->
        <div class="fixed top-4 right-4 flex gap-2">
            <!-- Язык -->
            <DropdownMenu>
                <DropdownMenuTrigger as-child>
                    <Button variant="outline" size="sm" class="gap-1.5">
                        <Languages class="h-4 w-4" />
                        {{ locale === "ru" ? "RU" : "EN" }}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem @click="setLocale('ru')">
                        <Check v-if="locale === 'ru'" class="h-4 w-4 mr-2" />
                        <span v-else class="h-4 w-4 mr-2" />
                        {{ t("editor.langRu") }}
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="setLocale('en')">
                        <Check v-if="locale === 'en'" class="h-4 w-4 mr-2" />
                        <span v-else class="h-4 w-4 mr-2" />
                        {{ t("editor.langEn") }}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <!-- Тема -->
            <DropdownMenu>
                <DropdownMenuTrigger as-child>
                    <Button variant="outline" size="sm">
                        <Sun v-if="currentTheme === 'light'" class="h-4 w-4" />
                        <Moon
                            v-else-if="currentTheme === 'dark'"
                            class="h-4 w-4"
                        />
                        <Monitor v-else class="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem @click="setTheme('light')">
                        <Check
                            v-if="currentTheme === 'light'"
                            class="h-4 w-4 mr-2"
                        />
                        <span v-else class="h-4 w-4 mr-2" />
                        <Sun class="h-4 w-4 mr-2" />{{ t("editor.themeLight") }}
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="setTheme('dark')">
                        <Check
                            v-if="currentTheme === 'dark'"
                            class="h-4 w-4 mr-2"
                        />
                        <span v-else class="h-4 w-4 mr-2" />
                        <Moon class="h-4 w-4 mr-2" />{{ t("editor.themeDark") }}
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="setTheme('auto')">
                        <Check
                            v-if="currentTheme === 'auto'"
                            class="h-4 w-4 mr-2"
                        />
                        <span v-else class="h-4 w-4 mr-2" />
                        <Monitor class="h-4 w-4 mr-2" />{{
                            t("editor.themeAuto")
                        }}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>

        <Card class="w-[400px]">
            <CardHeader>
                <CardTitle class="text-2xl">{{
                    t("auth.login.title")
                }}</CardTitle>
                <CardDescription>{{
                    t("auth.login.subtitle")
                }}</CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
                <div class="space-y-2">
                    <Label for="email">{{ t("auth.login.email") }}</Label>
                    <Input
                        id="email"
                        v-model="email"
                        type="email"
                        placeholder="you@example.com"
                    />
                </div>
                <div class="space-y-2">
                    <Label for="password">{{ t("auth.login.password") }}</Label>
                    <Input
                        id="password"
                        v-model="password"
                        type="password"
                        placeholder="••••••••"
                        @keyup.enter="submit"
                    />
                </div>
                <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
            </CardContent>
            <CardFooter class="flex flex-col gap-3">
                <Button class="w-full" :disabled="loading" @click="submit">
                    {{
                        loading
                            ? t("auth.login.submitting")
                            : t("auth.login.submit")
                    }}
                </Button>

                <div class="relative w-full">
                    <div class="absolute inset-0 flex items-center">
                        <span class="w-full border-t border-border" />
                    </div>
                    <div class="relative flex justify-center text-xs uppercase">
                        <span class="bg-card px-2 text-muted-foreground">{{
                            t("auth.login.orContinueWith")
                        }}</span>
                    </div>
                </div>

                <div class="flex gap-2 w-full">
                    <Button
                        variant="outline"
                        class="flex-1 gap-2 flex-col h-auto py-2"
                        @click="loginWithGoogle"
                    >
                        <div class="flex items-center gap-2">
                            <GoogleIcon :size="16" />
                            Google
                        </div>
                        <span
                            v-if="lastLogin?.method === 'google'"
                            class="text-[10px] text-muted-foreground leading-none truncate max-w-full px-1"
                            >{{ lastLogin.email }}</span
                        >
                    </Button>
                    <Button
                        variant="outline"
                        class="flex-1 gap-2 flex-col h-auto py-2"
                        @click="loginWithGithub"
                    >
                        <div class="flex items-center gap-2">
                            <Github class="h-4 w-4" />
                            GitHub
                        </div>
                        <span
                            v-if="lastLogin?.method === 'github'"
                            class="text-[10px] text-muted-foreground leading-none truncate max-w-full px-1"
                            >{{ lastLogin.email }}</span
                        >
                    </Button>
                </div>
                <!-- Last used: email -->
                <p
                    v-if="lastLogin?.method === 'email'"
                    class="text-xs text-muted-foreground text-center"
                >
                    {{ t("auth.login.lastUsed") }}
                    <span class="font-medium text-foreground">{{
                        lastLogin.email
                    }}</span>
                </p>

                <p
                    v-if="oauthError"
                    class="text-sm text-destructive text-center"
                >
                    {{ oauthError }}
                </p>

                <p class="text-sm text-muted-foreground text-center">
                    {{ t("auth.login.noAccount") }}
                    <RouterLink
                        to="/register"
                        class="text-primary hover:underline"
                        >{{ t("auth.login.register") }}</RouterLink
                    >
                </p>
            </CardFooter>
        </Card>

        <!-- Модал объединения аккаунтов -->
        <Dialog :open="linkDialogOpen" @update:open="linkDialogOpen = $event">
            <DialogContent class="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{{ t("auth.link.title") }}</DialogTitle>
                    <DialogDescription>
                        {{
                            t("auth.link.description", {
                                provider: linkProvider,
                                email: linkEmail,
                            })
                        }}
                    </DialogDescription>
                </DialogHeader>

                <div class="flex flex-col items-center gap-4 py-2">
                    <Input
                        v-model="linkCode"
                        type="text"
                        inputmode="numeric"
                        maxlength="6"
                        placeholder="123456"
                        class="text-center text-2xl tracking-[0.5em] w-48"
                        @input="
                            linkCode = linkCode.replace(/\D/g, '').slice(0, 6)
                        "
                    />
                    <p v-if="linkError" class="text-sm text-destructive">
                        {{ linkError }}
                    </p>
                </div>

                <DialogFooter>
                    <Button variant="outline" @click="linkDialogOpen = false">{{
                        t("auth.link.cancel")
                    }}</Button>
                    <Button
                        :disabled="linkCode.length < 6 || linkLoading"
                        @click="confirmLink"
                    >
                        {{
                            linkLoading
                                ? t("auth.link.confirming")
                                : t("auth.link.confirm")
                        }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { Github, Sun, Moon, Monitor, Languages, Check } from "lucide-vue-next";
import GoogleIcon from "@/components/GoogleIcon.vue";
import { useColorMode } from "@vueuse/core";
import { useAuthStore } from "@/stores/authStore";
import { i18n } from "@/main";
import api from "@/lib/api";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const { t, locale } = useI18n();
const colorMode = useColorMode({ attribute: "class", selector: "html" });
const currentTheme = ref<"light" | "dark" | "auto">(
    (localStorage.getItem("theme") as "light" | "dark" | "auto") ?? "auto",
);

function setLocale(lang: "ru" | "en") {
    i18n.global.locale.value = lang;
    localStorage.setItem("locale", lang);
}

function setTheme(theme: "light" | "dark" | "auto") {
    currentTheme.value = theme;
    colorMode.value = theme === "auto" ? "auto" : theme;
    localStorage.setItem("theme", theme);
}
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const lastLogin = auth.getLastLogin();

const email = ref(lastLogin?.method === "email" ? lastLogin.email : "");
const password = ref("");
const error = ref("");
const loading = ref(false);
const oauthError = ref("");

// Link account dialog
const linkDialogOpen = ref(false);
const linkEmail = ref("");
const linkProvider = ref("");
const linkCode = ref("");
const linkError = ref("");
const linkLoading = ref(false);

onMounted(async () => {
    const token = route.query.token as string | undefined;
    const err = route.query.error as string | undefined;
    const linkRequired = route.query.link_required as string | undefined;

    if (token) {
        auth.setToken(token);
        // Replace URL immediately to remove query params before any re-render
        await router.replace("/");
        await auth.fetchMe();
        return;
    }

    if (linkRequired) {
        linkEmail.value = decodeURIComponent(
            (route.query.link_email as string) ?? "",
        );
        linkProvider.value = decodeURIComponent(
            (route.query.link_provider as string) ?? "",
        );
        linkDialogOpen.value = true;
        return;
    }

    if (err) {
        oauthError.value = t("auth.login.oauthError");
    }
});

async function submit() {
    error.value = "";
    loading.value = true;
    try {
        await auth.login(email.value, password.value);
        router.push("/");
    } catch (e: unknown) {
        const err = e as {
            response?: { status?: number; data?: { message?: string } };
        };
        const status = err.response?.status;
        const serverMessage = err.response?.data?.message;
        if (status === 401 || status === 400) {
            error.value = serverMessage ?? t("auth.login.error");
        } else {
            console.error("[login]", e);
            error.value = t("auth.login.error");
        }
    } finally {
        loading.value = false;
    }
}

const apiBase = import.meta.env.VITE_API_URL ?? "";

function loginWithGoogle() {
    window.location.href = `${apiBase}/api/auth/google/redirect`;
}

function loginWithGithub() {
    window.location.href = `${apiBase}/api/auth/github/redirect`;
}

async function confirmLink() {
    linkError.value = "";
    linkLoading.value = true;
    try {
        const { data } = await api.post("/api/auth/link/confirm", {
            email: linkEmail.value,
            code: linkCode.value,
        });
        auth.setToken(data.token);
        await auth.fetchMe();
        router.replace("/");
    } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: string } } };
        linkError.value = err.response?.data?.message ?? t("auth.link.error");
    } finally {
        linkLoading.value = false;
    }
}
</script>

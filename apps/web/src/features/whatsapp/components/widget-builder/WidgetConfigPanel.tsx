import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { WidgetConfig } from "./types";

interface WidgetConfigPanelProps {
  config: WidgetConfig;
  updateConfig: (key: string, value: any) => void;
  userList: Array<any>;
  usersLoading: boolean;
}

// Custom Switch component to avoid missing dependencies
const ToggleSwitch = ({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (checked: boolean) => void }) => (
  <button
    type="button"
    onClick={() => onCheckedChange(!checked)}
    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
      checked ? 'bg-pp-blue' : 'bg-slate-200 dark:bg-zinc-700'
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[var(--bg-card)] shadow ring-0 transition duration-200 ease-in-out ${
        checked ? 'translate-x-4' : 'translate-x-0'
      }`}
    />
  </button>
);

export default function WidgetConfigPanel({
  config,
  updateConfig,
  userList = [],
  usersLoading,
}: WidgetConfigPanelProps) {

  return (
    <Tabs defaultValue="content" className="space-y-6 flex flex-col">
      <TabsList className="w-full flex items-center justify-start gap-1 p-1.5 bg-[#F4F3F1] dark:bg-white/5 rounded-2xl border border-slate-200/50 dark:border-white/5 h-auto self-start shadow-sm">
        <TabsTrigger 
          value="content" 
          className="rounded-xl px-4.5 py-2 text-xs font-bold text-secondary transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-[#222226] data-[state=active]:text-pp-blue data-[state=active]:shadow-sm hover:text-main"
        >
          Content
        </TabsTrigger>
        <TabsTrigger 
          value="design" 
          className="rounded-xl px-4.5 py-2 text-xs font-bold text-secondary transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-[#222226] data-[state=active]:text-pp-blue data-[state=active]:shadow-sm hover:text-main"
        >
          Design
        </TabsTrigger>
        <TabsTrigger 
          value="layouts" 
          className="rounded-xl px-4.5 py-2 text-xs font-bold text-secondary transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-[#222226] data-[state=active]:text-pp-blue data-[state=active]:shadow-sm hover:text-main"
        >
          Layouts
        </TabsTrigger>
        <TabsTrigger 
          value="team" 
          className="rounded-xl px-4.5 py-2 text-xs font-bold text-secondary transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-[#222226] data-[state=active]:text-pp-blue data-[state=active]:shadow-sm hover:text-main"
        >
          Team
        </TabsTrigger>
        <TabsTrigger 
          value="advanced" 
          className="rounded-xl px-4.5 py-2 text-xs font-bold text-secondary transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-[#222226] data-[state=active]:text-pp-blue data-[state=active]:shadow-sm hover:text-main"
        >
          Advanced
        </TabsTrigger>
      </TabsList>

      {/* Content Tab */}
      <TabsContent value="content" className="space-y-6">
        <Card className="rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-main">Welcome Messages</CardTitle>
            <CardDescription className="text-sm text-secondary">
              Customize your greeting text
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-secondary">Title</Label>
                <Input
                  value={config.title}
                  onChange={(e) => updateConfig("title", e.target.value)}
                  placeholder="Welcome!"
                  className="pp-input"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-secondary">Subtitle</Label>
                <Input
                  value={config.subtitle}
                  onChange={(e) => updateConfig("subtitle", e.target.value)}
                  placeholder="How can we help?"
                  className="pp-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-secondary">Widget Name</Label>
                <Input
                  value={config.name}
                  onChange={(e) => updateConfig("name", e.target.value)}
                  placeholder="Name"
                  className="pp-input"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-secondary">Allowed Domain</Label>
                <Input
                  value={config.domain}
                  onChange={(e) => updateConfig("domain", e.target.value)}
                  placeholder="www.example.com"
                  className="pp-input"
                />
                <p className="text-[10px] text-secondary mt-1">
                  Leave empty to allow on all domains.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-secondary">Chat Greeting</Label>
              <Textarea
                value={config.greeting}
                onChange={(e) => updateConfig("greeting", e.target.value)}
                placeholder="Hi! How can I help you today?"
                className="pp-textarea"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-secondary">Response Time</Label>
              <Select
                value={config.responseTime}
                onValueChange={(value) => updateConfig("responseTime", value)}
              >
                <SelectTrigger className="w-full h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A few minutes">A few minutes</SelectItem>
                  <SelectItem value="A few hours">A few hours</SelectItem>
                  <SelectItem value="Within a day">Within a day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Design Tab */}
      <TabsContent value="design" className="space-y-6">
        <Card className="rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-main">Widget Style & Colors</CardTitle>
            <CardDescription className="text-sm text-secondary">
              Customize the visual appearance of the chat widget.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-secondary block">Style Preset</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'modern', label: 'Modern', desc: 'Gradient headers' },
                  { value: 'classic', label: 'Classic', desc: 'Solid brand colors' },
                  { value: 'minimal', label: 'Minimal', desc: 'Clean outline UI' }
                ].map((preset) => (
                  <div
                    key={preset.value}
                    onClick={() => updateConfig("widgetStyle", preset.value)}
                    className={`flex flex-col justify-between p-3.5 border rounded-2xl cursor-pointer transition-all duration-200 select-none ${
                      config.widgetStyle === preset.value
                        ? "border-pp-blue bg-pp-blue-tint/20 dark:bg-pp-blue-tint/10 shadow-sm ring-1 ring-pp-blue"
                        : "border-pp-border hover:bg-slate-50/50 dark:hover:bg-[#16161a]"
                    }`}
                  >
                    <div>
                      <p className="font-bold text-xs text-main">{preset.label}</p>
                      <p className="text-[10px] text-secondary mt-1 leading-normal">{preset.desc}</p>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <div className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all ${
                        config.widgetStyle === preset.value 
                          ? "border-pp-blue bg-pp-blue" 
                          : "border-slate-300 dark:border-slate-600"
                      }`}>
                        {config.widgetStyle === preset.value && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-secondary">Primary Color</Label>
                <div className="flex gap-2 items-center">
                  <div className="relative w-11 h-11 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-white/10 shrink-0 cursor-pointer">
                    <input
                      type="color"
                      value={config.primaryColor}
                      onChange={(e) => updateConfig("primaryColor", e.target.value)}
                      className="absolute inset-[-50%] w-[200%] h-[200%] cursor-pointer opacity-0"
                    />
                    <div className="w-full h-full pointer-events-none" style={{ backgroundColor: config.primaryColor }} />
                  </div>
                  <Input
                    type="text"
                    value={config.primaryColor}
                    onChange={(e) => updateConfig("primaryColor", e.target.value)}
                    className="pp-input font-mono uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-secondary">Accent Color</Label>
                <div className="flex gap-2 items-center">
                  <div className="relative w-11 h-11 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-white/10 shrink-0 cursor-pointer">
                    <input
                      type="color"
                      value={config.accentColor}
                      onChange={(e) => updateConfig("accentColor", e.target.value)}
                      className="absolute inset-[-50%] w-[200%] h-[200%] cursor-pointer opacity-0"
                    />
                    <div className="w-full h-full pointer-events-none" style={{ backgroundColor: config.accentColor }} />
                  </div>
                  <Input
                    type="text"
                    value={config.accentColor}
                    onChange={(e) => updateConfig("accentColor", e.target.value)}
                    className="pp-input font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-secondary">Company Logo URL</Label>
                <Input
                  type="url"
                  value={config.logoUrl}
                  onChange={(e) => updateConfig("logoUrl", e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="pp-input"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-secondary">Widget Position</Label>
                <Select
                  value={config.position}
                  onValueChange={(value) => updateConfig("position", value)}
                >
                  <SelectTrigger className="w-full h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom-right">Bottom Right</SelectItem>
                    <SelectItem value="bottom-left">Bottom Left</SelectItem>
                    <SelectItem value="top-right">Top Right</SelectItem>
                    <SelectItem value="top-left">Top Left</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Layouts Tab */}
      <TabsContent value="layouts" className="space-y-6">
        <Card className="rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-main">Messenger Layout Settings</CardTitle>
            <CardDescription className="text-sm text-secondary">
              Configure the layout and behaviour of the widget.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-secondary">Button CTA Text</Label>
                <Input
                  value={config.messengerButtonText}
                  onChange={(e) => updateConfig("messengerButtonText", e.target.value)}
                  placeholder="Chat on WhatsApp"
                  className="pp-input"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-secondary">Search Placeholder</Label>
                <Input
                  value={config.messengerSearchPlaceholder}
                  onChange={(e) => updateConfig("messengerSearchPlaceholder", e.target.value)}
                  placeholder="Search FAQs..."
                  className="pp-input"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-secondary">FAQs to Display</Label>
              <Select
                value={config.articlesCount.toString()}
                onValueChange={(value) => updateConfig("articlesCount", parseInt(value))}
              >
                <SelectTrigger className="w-full h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 FAQs</SelectItem>
                  <SelectItem value="3">3 FAQs</SelectItem>
                  <SelectItem value="4">4 FAQs</SelectItem>
                  <SelectItem value="5">5 FAQs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-slate-500/5 transition-all hover:bg-slate-50 dark:hover:bg-white/10">
                <div className="space-y-1">
                  <Label className="text-sm font-bold text-main block cursor-pointer">Show Avatars</Label>
                  <p className="text-[10px] text-secondary leading-snug max-w-[140px]">Display team member photos in widget header</p>
                </div>
                <ToggleSwitch
                  checked={config.showTeamAvatars}
                  onCheckedChange={(checked) => updateConfig("showTeamAvatars", checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-slate-500/5 transition-all hover:bg-slate-50 dark:hover:bg-white/10">
                <div className="space-y-1">
                  <Label className="text-sm font-bold text-main block cursor-pointer">Recent FAQs</Label>
                  <p className="text-[10px] text-secondary leading-snug max-w-[140px]">Display popular FAQ pairs to visitors</p>
                </div>
                <ToggleSwitch
                  checked={config.showRecentArticles}
                  onCheckedChange={(checked) => updateConfig("showRecentArticles", checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Team Tab */}
      <TabsContent value="team" className="space-y-6">
        <Card className="rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-main">Support Team</CardTitle>
            <CardDescription className="text-sm text-secondary">
              Manage team members visible in the widget header.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {config.teamMembers.map((member, index) => (
              <div key={member.id} className="flex items-center gap-4 p-3 border border-slate-200 dark:border-white/10 rounded-xl">
                <Avatar className="h-10 w-10">
                  {member.avatar ? (
                    <AvatarImage src={member.avatar} alt={member.name} />
                  ) : null}
                  <AvatarFallback className="bg-pp-blue/10 text-pp-blue font-bold">
                    {member.name?.[0] ?? "U"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-3">
                  <Select
                    value={member.userId || "none"}
                    onValueChange={(selectedId) => {
                      const selectedUser = userList.find((u) => String(u.id) === selectedId);
                      const newMembers = [...config.teamMembers];
                      if (newMembers[index]) {
                        if (selectedUser && selectedId !== "none") {
                          newMembers[index] = {
                            ...member,
                            userId: String(selectedUser.id),
                            name: selectedUser.name || "Support Member",
                            role: selectedUser.role || "Support",
                            avatar: selectedUser.avatar || "",
                            email: selectedUser.email,
                          };
                        } else {
                          newMembers[index].userId = "";
                        }
                      }
                      updateConfig("teamMembers", newMembers);
                    }}
                  >
                    <SelectTrigger className="w-full h-11 rounded-xl bg-slate-50/50">
                      <SelectValue placeholder="— Select a user —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Select a user —</SelectItem>
                      {usersLoading && <SelectItem value="loading" disabled>Loading users...</SelectItem>}
                      {userList.map((user) => (
                        <SelectItem key={user.id} value={String(user.id)}>
                          {user.name} <span className="text-secondary text-[10px] ml-1">({user.email})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      value={member.name}
                      onChange={(e) => {
                        const newMembers = [...config.teamMembers];
                        if (newMembers[index]) {
                          newMembers[index].name = e.target.value;
                          updateConfig("teamMembers", newMembers);
                        }
                      }}
                      placeholder="Display Name"
                      className="pp-input"
                    />
                    <Input
                      value={member.role}
                      onChange={(e) => {
                        const newMembers = [...config.teamMembers];
                        if (newMembers[index]) {
                          newMembers[index].role = e.target.value;
                          updateConfig("teamMembers", newMembers);
                        }
                      }}
                      placeholder="Role (e.g., Support)"
                      className="pp-input"
                    />
                  </div>
                </div>

                <Button
                  variant="ghost"
                  onClick={() => {
                    const newMembers = config.teamMembers.filter((_, i) => i !== index);
                    updateConfig("teamMembers", newMembers);
                  }}
                  className="text-xs hover:text-red-500 font-semibold"
                >
                  Remove
                </Button>
              </div>
            ))}

            <Button
              variant="outline"
              className="w-full rounded-xl text-sm font-semibold border-dashed"
              onClick={() => {
                const newMembers = [
                  ...config.teamMembers,
                  {
                    id: Date.now().toString(),
                    name: "",
                    role: "Support",
                    avatar: "",
                    userId: "",
                  },
                ];
                updateConfig("teamMembers", newMembers);
              }}
            >
              + Add Team Member
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Advanced Tab */}
      <TabsContent value="advanced" className="space-y-6">
        <Card className="rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-main">Advanced Features</CardTitle>
            <CardDescription className="text-sm text-secondary">
              Configure AI behaviour and advanced widget controls.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-slate-500/5 transition-all hover:bg-slate-50 dark:hover:bg-white/10">
                <div className="space-y-1">
                  <Label className="text-sm font-bold text-main block cursor-pointer">Live Chat</Label>
                  <p className="text-[10px] text-secondary leading-snug max-w-[140px]">Enable real-time messaging with visitors</p>
                </div>
                <ToggleSwitch
                  checked={config.enableChat}
                  onCheckedChange={(checked) => {
                    if (!checked && !config.enableAiAutoReply) return;
                    updateConfig("enableChat", checked);
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-slate-500/5 transition-all hover:bg-slate-50 dark:hover:bg-white/10">
                <div className="space-y-1">
                  <Label className="text-sm font-bold text-main block cursor-pointer">AI Auto-Reply</Label>
                  <p className="text-[10px] text-secondary leading-snug max-w-[140px]">Automatically reply using AI training data</p>
                </div>
                <ToggleSwitch
                  checked={config.enableAiAutoReply}
                  onCheckedChange={(checked) => {
                    if (!checked && !config.enableChat) return;
                    updateConfig("enableAiAutoReply", checked);
                  }}
                />
              </div>
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-secondary">Font Family</Label>
                <Select
                  value={config.fontFamily}
                  onValueChange={(value) => updateConfig("fontFamily", value)}
                >
                  <SelectTrigger className="w-full h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System Default</SelectItem>
                    <SelectItem value="inter">Inter</SelectItem>
                    <SelectItem value="roboto">Roboto</SelectItem>
                    <SelectItem value="open-sans">Open Sans</SelectItem>
                    <SelectItem value="poppins">Poppins</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-secondary">Button Style</Label>
                <Select
                  value={config.buttonStyle}
                  onValueChange={(value) => updateConfig("buttonStyle", value)}
                >
                  <SelectTrigger className="w-full h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Solid Fill</SelectItem>
                    <SelectItem value="outline">Outline</SelectItem>
                    <SelectItem value="gradient">Gradient</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-secondary">Shadow Intensity</Label>
                <Select
                  value={config.shadowIntensity}
                  onValueChange={(value) => updateConfig("shadowIntensity", value)}
                >
                  <SelectTrigger className="w-full h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="strong">Strong</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

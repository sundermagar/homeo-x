import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageSquare,
  Send,
  X,
  ArrowLeft,
  Search,
  ChevronRight,
  ChevronDown,
  Clock,
  HelpCircle,
} from "lucide-react";
import { WidgetConfig, ChatMessage, PreviewScreen } from "./types";

interface WidgetPreviewProps {
  config: WidgetConfig;
  isPreviewOpen: boolean;
  setIsPreviewOpen: (open: boolean) => void;
  previewScreen: PreviewScreen;
  setPreviewScreen: (screen: PreviewScreen) => void;
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (input: string) => void;
  sendChatMessage: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  qaPairs: Array<{ id: string; question: string; answer: string; category: string; isActive: boolean }>;
}

export default function WidgetPreview({
  config,
  isPreviewOpen,
  setIsPreviewOpen,
  previewScreen,
  setPreviewScreen,
  chatMessages,
  chatInput,
  setChatInput,
  sendChatMessage,
  searchQuery,
  setSearchQuery,
  qaPairs,
}: WidgetPreviewProps) {
  const fontFamilyMap: Record<string, string> = {
    system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    inter: "'Inter', sans-serif",
    roboto: "'Roboto', sans-serif",
    "open-sans": "'Open Sans', sans-serif",
    poppins: "'Poppins', sans-serif",
  };

  const fontFamilyValue = fontFamilyMap[config.fontFamily] || fontFamilyMap["system"];

  const shadowMap: Record<string, string> = {
    none: "none",
    light: "0 4px 16px rgba(0, 0, 0, 0.05)",
    medium: "0 10px 30px rgba(0, 0, 0, 0.1)",
    strong: "0 16px 48px rgba(0, 0, 0, 0.2)",
  };

  const containerShadow = shadowMap[config.shadowIntensity] || shadowMap["medium"];

  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  const getButtonStyle = () => {
    if (config.buttonStyle === "outline") {
      return {
        backgroundColor: "transparent",
        color: config.primaryColor,
        border: `2px solid ${config.primaryColor}`,
      };
    }
    if (config.buttonStyle === "gradient") {
      return {
        background: `linear-gradient(135deg, ${config.primaryColor}, ${config.accentColor})`,
        color: "white",
        border: "none",
      };
    }
    return {
      backgroundColor: config.primaryColor,
      color: "white",
      border: "none",
    };
  };

  const googleFontLinks: Record<string, string> = {
    inter: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
    roboto: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap",
    "open-sans": "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap",
    poppins: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap",
  };
  const googleFontLink = googleFontLinks[config.fontFamily] || null;

  return (
    <>
      {googleFontLink && (
        <link rel="stylesheet" href={googleFontLink} />
      )}
      <style>{`
        #widget-preview-container,
        #widget-preview-container *,
        #widget-preview-container *::before,
        #widget-preview-container *::after {
          font-family: ${fontFamilyValue} !important;
        }
      `}</style>
      <div className="relative h-[720px] flex flex-col bg-white rounded-3xl border border-pp-border shadow-lg overflow-hidden">
        {/* Browser Top Bar Mockup */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-pp-border bg-slate-50/70">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#FF5F56] inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#FFBD2E] inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#27C93F] inline-block" />
          </div>
          <div className="flex-1 max-w-sm mx-4 bg-white border border-pp-border rounded-lg px-3 py-1 text-xs text-secondary font-sans text-center truncate select-none shadow-sm flex items-center justify-center gap-1">
            <span className="text-slate-400">https://</span>{config.domain || "yourclinic.com"}
          </div>
          <div className="w-12" /> {/* spacer */}
        </div>

        {/* Browser Content Area Canvas */}
        <div className="flex-1 relative bg-slate-50 flex items-center justify-center p-6 overflow-hidden bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
          {/* Widget Container */}
        {isPreviewOpen && (
          <div
            id="widget-preview-container"
            className="relative w-[380px] h-[600px] flex flex-col bg-white border overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] z-10"
            style={{
              fontFamily: fontFamilyValue,
              boxShadow: containerShadow,
              borderRadius:
                config.roundedCorners === "sm"
                  ? "0.5rem"
                  : config.roundedCorners === "lg"
                  ? "1rem"
                  : "1.5rem",
            }}
          >
            {/* Widget Header */}
            <div
              className="p-4 text-white"
              style={{
                background:
                  config.widgetStyle === "modern"
                    ? `linear-gradient(135deg, ${config.primaryColor}, ${config.accentColor})`
                    : config.primaryColor,
              }}
            >
              <div className="flex items-center justify-between">
                {previewScreen === "home" ? (
                  <>
                    <div className="flex items-center gap-3">
                      {config.logoUrl ? (
                        <img
                          src={config.logoUrl}
                          alt="Logo"
                          className="h-10 w-10 object-contain rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : null}
                      <div>
                        <h3 className="text-md font-semibold leading-tight">
                          {config.title}
                        </h3>
                        <p className="text-xs opacity-90">
                          {config.subtitle}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsPreviewOpen(false)}
                      className="p-1 hover:bg-white/20 rounded-full transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setPreviewScreen("home")}
                      className="p-1 hover:bg-white/20 rounded-full transition-colors"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="font-semibold text-sm">
                      {previewScreen === "chat"
                        ? "Conversation"
                        : previewScreen === "search"
                        ? "Search FAQs"
                        : "FAQ"}
                    </span>
                    <button
                      onClick={() => setIsPreviewOpen(false)}
                      className="p-1 hover:bg-white/20 rounded-full transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Widget Content */}
            <div className="flex-1 overflow-y-auto">
              {previewScreen === "home" && (
                <div className="p-4 space-y-4">
                  {/* Start Conversation Card */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      {config.showTeamAvatars && config.teamMembers.length > 0 ? (
                        <div className="flex -space-x-2">
                          {config.teamMembers.slice(0, 3).map((member) => (
                            <Avatar key={member.id} className="h-8 w-8 border-2 border-white shadow-sm">
                              {member.avatar ? (
                                <AvatarImage src={member.avatar} alt={member.name} />
                              ) : null}
                              <AvatarFallback
                                style={{
                                  backgroundColor: config.primaryColor,
                                  color: "white",
                                }}
                                className="text-[10px] font-bold"
                              >
                                {member.name?.[0] ?? "S"}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                      ) : null}
                      <div className="flex-1">
                        <p className="text-xs text-slate-400">Our usual reply time</p>
                        <p className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {config.responseTime}
                        </p>
                      </div>
                    </div>
                    <Button
                      className="w-full text-xs font-semibold h-9 rounded-lg"
                      style={getButtonStyle()}
                      onClick={() => setPreviewScreen("chat")}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {config.messengerButtonText}
                    </Button>
                  </div>

                  {/* Search Help */}
                  {config.showRecentArticles && (
                    <div className="space-y-2">
                      <p className="font-semibold text-xs text-slate-500 uppercase tracking-wider">
                        Find an answer quickly
                      </p>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder={config.messengerSearchPlaceholder}
                          className="pl-9 pr-8 h-9 text-xs rounded-lg border-slate-200"
                          onClick={() => setPreviewScreen("search")}
                        />
                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  )}

                  {/* Popular FAQs */}
                  {config.showRecentArticles && (() => {
                    const displayFaqs = qaPairs.slice(0, config.articlesCount);
                    return displayFaqs.length > 0 ? (
                      <div className="space-y-2">
                        <p className="font-semibold text-xs text-slate-500 uppercase tracking-wider">
                          Popular FAQs
                        </p>
                        <div className="space-y-2">
                          {displayFaqs.map((qa) => {
                            const isExpanded = expandedFaqId === qa.id;
                            return (
                              <div
                                key={qa.id}
                                className="border border-slate-200 rounded-lg overflow-hidden transition-all bg-white"
                              >
                                <button
                                  className="w-full text-left p-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-2"
                                  onClick={() => setExpandedFaqId(isExpanded ? null : qa.id)}
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-slate-800">
                                      {qa.question}
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                      {qa.category}
                                    </p>
                                  </div>
                                  <ChevronDown
                                    className={`h-3 w-3 text-slate-400 flex-shrink-0 transition-transform ${
                                      isExpanded ? "rotate-180" : ""
                                    }`}
                                  />
                                </button>
                                {isExpanded && (
                                  <div className="px-3 pb-3 pt-0">
                                    <div
                                      className="text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-2.5 border-l-2"
                                      style={{ borderLeftColor: config.primaryColor }}
                                    >
                                      {qa.answer || "No answer provided yet."}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

              {/* Chat Screen */}
              {previewScreen === "chat" && (
                <div className="flex flex-col h-full min-h-[480px]">
                  <div className="flex-1 p-4 space-y-3">
                    {chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex gap-2 ${
                          msg.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        {msg.role !== "user" && (
                          <Avatar className="h-7 w-7">
                            <AvatarFallback
                              style={{
                                backgroundColor: config.primaryColor,
                                color: "white",
                              }}
                              className="text-[9px] font-bold"
                            >
                              AI
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={`rounded-2xl px-3 py-2 max-w-[80%] text-xs ${
                            msg.role === "user" ? "text-white" : "bg-slate-100 text-slate-800"
                          }`}
                          style={
                            msg.role === "user"
                              ? { backgroundColor: config.primaryColor }
                              : {}
                          }
                        >
                          <p className="leading-relaxed">{msg.text}</p>
                          <p className="text-[9px] opacity-70 mt-1 text-right">
                            {msg.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t bg-white">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type your message..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                        className="h-9 text-xs rounded-lg"
                      />
                      <Button
                        onClick={sendChatMessage}
                        style={{ backgroundColor: config.primaryColor }}
                        className="h-9 w-9 p-0 rounded-lg text-white"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Search/Help Screen */}
              {previewScreen === "search" && (
                <div className="p-4 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search FAQs..."
                      className="pl-9 h-9 text-xs rounded-lg"
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {searchQuery ? "Search results" : "Popular FAQs"}
                    </p>
                    {(() => {
                      const filtered = searchQuery
                        ? qaPairs.filter(
                            (qa) =>
                              qa.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              qa.answer?.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                        : qaPairs.slice(0, config.articlesCount);
                      return filtered.length > 0 ? (
                        <div className="space-y-2">
                          {filtered.map((qa) => {
                            const isExpanded = expandedFaqId === qa.id;
                            return (
                              <div
                                key={qa.id}
                                className="border border-slate-200 rounded-lg overflow-hidden bg-white"
                              >
                                <button
                                  className="w-full text-left p-3 hover:bg-slate-50 transition-colors flex items-start gap-2.5"
                                  onClick={() => setExpandedFaqId(isExpanded ? null : qa.id)}
                                >
                                  <HelpCircle
                                    className="h-4 w-4 mt-0.5 flex-shrink-0"
                                    style={{ color: config.primaryColor }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-xs text-slate-800">
                                      {qa.question}
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                      {qa.category}
                                    </p>
                                  </div>
                                  <ChevronDown
                                    className={`h-3 w-3 text-slate-400 flex-shrink-0 mt-0.5 transition-transform ${
                                      isExpanded ? "rotate-180" : ""
                                    }`}
                                  />
                                </button>
                                {isExpanded && (
                                  <div className="px-3 pb-3 pt-0 pl-9">
                                    <div
                                      className="text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-2.5 border-l-2"
                                      style={{ borderLeftColor: config.primaryColor }}
                                    >
                                      {qa.answer || "No answer provided yet."}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 text-center py-6">
                          No FAQs match your search
                        </p>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Powered By Footer */}
            {config.showPoweredBy && (
              <div className="p-2 border-t text-center bg-slate-50 pointer-events-none select-none">
                <p className="text-[9px] text-slate-400">
                  Powered by {config.appName}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Floating Chat Button */}
        {!isPreviewOpen && (
          <button
            onClick={() => {
              setIsPreviewOpen(true);
              setPreviewScreen("home");
            }}
            className="relative p-4 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all text-white z-10"
            style={{
              background:
                config.buttonStyle === "gradient"
                  ? `linear-gradient(135deg, ${config.primaryColor}, ${config.accentColor})`
                  : config.buttonStyle === "outline"
                  ? "white"
                  : config.primaryColor,
              border: config.buttonStyle === "outline" ? `2.5px solid ${config.primaryColor}` : "none",
              color: config.buttonStyle === "outline" ? config.primaryColor : "white",
            }}
          >
            <MessageSquare className="h-6 w-6" />
          </button>
        )}
        </div>
      </div>
    </>
  );
}

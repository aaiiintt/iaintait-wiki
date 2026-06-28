// Natural Language Intent Mapper
export function getSemanticIntentKeyphrase(query: string): string | null {
  const q = query.toLowerCase().trim();
  const words = new Set(q.split(/[^a-z0-9']+/));

  const hasPhrase = (phrase: string) => q.includes(phrase);
  const hasWord = (prefix: string) => {
    for (const w of words) {
      if (w.startsWith(prefix)) return true;
    }
    return false;
  };

  // 1. Surprise Me / Random Selection
  if (
    hasWord("surprise") || 
    hasWord("random") || 
    hasWord("easter") || 
    hasWord("lucky") ||
    hasPhrase("surprise me") ||
    hasPhrase("give me a surprise") ||
    hasPhrase("feeling lucky")
  ) {
    return "surprise_me";
  }

  // 2. Hire & FAQ (Availability, Pricing, Contact, Locations)
  if (
    hasWord("hire") || 
    hasWord("contact") || 
    hasWord("email") || 
    hasWord("rate") || 
    hasWord("price") || 
    hasWord("cost") ||
    hasWord("availab") || 
    hasWord("sprint") || 
    hasWord("labs") || 
    hasWord("pitch") ||
    hasWord("office") ||
    hasWord("location") ||
    hasWord("address") ||
    hasPhrase("day rate") ||
    hasPhrase("working with iain")
  ) {
    return "hire_faq";
  }

  // 3. Collaborators & People
  if (
    hasPhrase("worked with") || 
    hasPhrase("work with") || 
    hasPhrase("who did") ||
    hasPhrase("who is") ||
    hasPhrase("who are") ||
    hasWord("collaborat") || 
    hasWord("people") || 
    hasWord("team") || 
    hasWord("partner") ||
    hasWord("founder") ||
    hasWord("colleague") ||
    hasWord("farnhill") ||
    hasWord("roope") ||
    hasWord("turley") ||
    hasWord("waterfall") ||
    hasWord("clark")
  ) {
    return "collaborators";
  }

  // 4. Key Campaigns & Iconic Projects
  if (
    hasWord("campaign") ||
    hasWord("project") ||
    hasWord("award") ||
    hasWord("cannes") ||
    hasWord("nike") ||
    hasWord("spice") ||
    hasWord("pokemon") ||
    hasWord("baker") ||
    hasWord("ingress") ||
    hasWord("honda") ||
    hasPhrase("most awarded") ||
    hasPhrase("best work") ||
    hasPhrase("famous work") ||
    hasPhrase("iconic projects")
  ) {
    return "key_campaigns";
  }

  // 5. Creative Philosophy (AI, Emerging Tech, Views)
  if (
    hasWord("philosoph") || 
    hasWord("view") || 
    hasWord("opinion") || 
    hasWord("belief") ||
    hasWord("ai") || 
    hasWord("emerg") || 
    hasWord("technolog") || 
    hasWord("tech") ||
    hasWord("innovat") ||
    hasWord("controvers")
  ) {
    return "creative_philosophy";
  }

  // 6. Career Overview & Agency History
  if (
    hasWord("poke") || 
    hasWord("wieden") || 
    hasWord("w+k") || 
    hasWord("wk") || 
    hasWord("google") || 
    hasWord("gcl") || 
    hasWord("food") ||
    hasPhrase("where next") ||
    hasPhrase("where have you worked") ||
    hasPhrase("work history") ||
    hasPhrase("career overview") ||
    hasPhrase("agencies & eras") ||
    hasPhrase("about")
  ) {
    return "career_overview";
  }

  // 7. Talks & Podcasts
  if (
    hasWord("talk") ||
    hasWord("podcast") ||
    hasWord("speak") ||
    hasWord("interview") ||
    hasWord("article")
  ) {
    return "talks";
  }

  // 8. About this site
  if (
    hasPhrase("how does this site work") ||
    hasPhrase("how this site works") ||
    hasPhrase("about this site") ||
    hasPhrase("about the site") ||
    hasPhrase("technology behind this site") ||
    hasPhrase("why is this site interesting") ||
    hasPhrase("how was this site built") ||
    hasWord("architecture")
  ) {
    return "about_site";
  }

  // 9. MCP Server Connection Setup
  if (
    hasWord("mcp") ||
    hasPhrase("connect to mcp") ||
    hasPhrase("mcp setup") ||
    hasPhrase("mcp integration") ||
    hasPhrase("model context protocol") ||
    hasPhrase("claude code mcp") ||
    hasPhrase("cursor mcp") ||
    hasPhrase("antigravity mcp") ||
    hasPhrase("how to connect my tools")
  ) {
    return "mcp_setup";
  }

  return null;
}

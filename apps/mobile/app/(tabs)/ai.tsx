import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, View,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { LiquidPressable as Pressable } from "@/components/LiquidPressable";

type ChatMessage = { id: string; role: "user" | "assistant"; content: string; createdAt: number };
const starters = [
  "Bantu buat caption promo motor Honda",
  "Bagaimana cara follow-up calon konsumen?",
  "Bantu susun strategi mencapai target penjualan",
  "Jelaskan perbedaan tipe motor Honda",
];
const STORAGE_PREFIX = "honda-ai-chat-v1:";

export default function AiAssistantScreen() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyReady, setHistoryReady] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    let active = true;
    setHistoryReady(false);
    AsyncStorage.getItem(STORAGE_PREFIX + (profile?.id ?? ""))
      .then((raw) => {
        if (!active) return;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) setMessages(parsed.slice(-60));
          } catch { setMessages([]); }
        } else setMessages([]);
      })
      .catch(() => { if (active) setMessages([]); })
      .finally(() => { if (active) setHistoryReady(true); });
    return () => { active = false; };
  }, [profile?.id]);

  useEffect(() => {
    if (!historyReady || !profile?.id) return;
    AsyncStorage.setItem(STORAGE_PREFIX + profile.id, JSON.stringify(messages)).catch(() => {});
  }, [messages, historyReady, profile?.id]);

  const sendMessage = useCallback(async (override?: string) => {
    const text = (override ?? draft).trim();
    if (!text || loading || !profile?.id) return;
    if (text.length > 4000) {
      Alert.alert("Pesan terlalu panjang", "Maksimal 4.000 karakter untuk satu pesan.");
      return;
    }
    const userMessage: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: text, createdAt: Date.now() };
    const next = [...messages, userMessage];
    setMessages(next);
    setDraft("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: { messages: next.slice(-12).map(({ role, content }) => ({ role, content })) },
      });
      if (error) throw error;
      if (!data?.reply || typeof data.reply !== "string") {
        throw new Error(data?.error || "AI belum memberikan jawaban. Coba lagi.");
      }
      setMessages((current) => [...current, {
        id: `a-${Date.now()}`, role: "assistant", content: data.reply, createdAt: Date.now(),
      }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menghubungi Asisten AI.";
      Alert.alert("Asisten AI belum merespons", message);
    } finally {
      setLoading(false);
    }
  }, [draft, loading, messages, profile?.id]);

  const clearChat = () => Alert.alert("Hapus percakapan?", "Riwayat chat di perangkat ini akan dihapus.", [
    { text: "Batal", style: "cancel" },
    { text: "Hapus", style: "destructive", onPress: () => setMessages([]) },
  ]);

  return (
    <KeyboardAvoidingView style={s.page} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}>
      <View style={s.header}>
        <View style={s.brandIcon}><Ionicons name="sparkles" size={21} color="#FFF" /></View>
        <View style={s.headerCopy}>
          <Text style={s.title}>Asisten AI</Text>
          <Text style={s.subtitle}>Teman diskusi dan pendamping kerja sales</Text>
        </View>
        <Pressable onPress={clearChat} accessibilityRole="button" accessibilityLabel="Hapus riwayat chat" style={s.clearButton}>
          <Ionicons name="trash-outline" size={20} color="#777780" />
        </Pressable>
      </View>

      <ScrollView ref={scrollRef} style={s.chat} contentContainerStyle={s.chatContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
        {messages.length === 0 ? (
          <View style={s.welcome}>
            <View style={s.welcomeIcon}><Ionicons name="chatbubbles" size={30} color="#E60012" /></View>
            <Text style={s.welcomeTitle}>Halo, {profile?.full_name?.split(" ")[0] || "Sales"}!</Text>
            <Text style={s.welcomeText}>Aku Asisten AI. Kamu bisa bertanya bebas, berdiskusi, atau minta bantuan untuk pekerjaan maupun hal lainnya.</Text>
            <Text style={s.suggestionLabel}>COBA TANYAKAN</Text>
            {starters.map((item) => (
              <Pressable key={item} style={s.suggestion} onPress={() => sendMessage(item)}>
                <Text style={s.suggestionText}>{item}</Text>
                <Ionicons name="arrow-up-circle-outline" size={19} color="#E60012" />
              </Pressable>
            ))}
          </View>
        ) : messages.map((message) => (
          <View key={message.id} style={[s.messageRow, message.role === "user" ? s.userRow : s.aiRow]}>
            {message.role === "assistant" && <View style={s.miniIcon}><Ionicons name="sparkles" size={13} color="#E60012" /></View>}
            <View style={[s.bubble, message.role === "user" ? s.userBubble : s.aiBubble]}>
              <Text style={[s.messageText, message.role === "user" && s.userText]}>{message.content}</Text>
            </View>
          </View>
        ))}
        {loading && <View style={[s.messageRow, s.aiRow]}><View style={s.miniIcon}><Ionicons name="sparkles" size={13} color="#E60012" /></View><View style={[s.bubble, s.aiBubble, s.typing]}><ActivityIndicator size="small" color="#E60012"/><Text style={s.typingText}>Sedang berpikir...</Text></View></View>}
      </ScrollView>

      <View style={s.composerWrap}>
        <TextInput value={draft} onChangeText={setDraft} placeholder="Tanyakan apa saja..." placeholderTextColor="#A0A0A8"
          multiline maxLength={4000} editable={!loading} style={s.input} returnKeyType="default" accessibilityLabel="Tulis pesan untuk Asisten AI" />
        <Pressable onPress={() => sendMessage()} disabled={!draft.trim() || loading} accessibilityRole="button" accessibilityLabel="Kirim pesan"
          style={[s.sendButton, (!draft.trim() || loading) && s.sendDisabled]}>
          <Ionicons name="arrow-up" size={21} color="#FFF" />
        </Pressable>
      </View>
      <Text style={s.disclaimer}>Jawaban AI bisa keliru. Periksa kembali informasi penting.</Text>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  page:{flex:1,backgroundColor:"#F4F5F7"},
  header:{flexDirection:"row",alignItems:"center",paddingHorizontal:18,paddingTop:22,paddingBottom:16,backgroundColor:"#FFF",borderBottomWidth:1,borderBottomColor:"#ECECF0",gap:12},
  brandIcon:{width:42,height:42,borderRadius:14,backgroundColor:"#E60012",alignItems:"center",justifyContent:"center"},
  headerCopy:{flex:1},title:{fontSize:19,fontWeight:"900",color:"#202027"},subtitle:{fontSize:11,color:"#85858F",marginTop:3},
  clearButton:{width:42,height:42,borderRadius:13,backgroundColor:"#F5F5F7",alignItems:"center",justifyContent:"center"},
  chat:{flex:1},chatContent:{padding:17,paddingBottom:25,flexGrow:1},
  welcome:{paddingTop:28},welcomeIcon:{width:58,height:58,borderRadius:20,backgroundColor:"#FFECEE",alignItems:"center",justifyContent:"center",marginBottom:17},
  welcomeTitle:{fontSize:24,fontWeight:"900",color:"#22222A"},welcomeText:{fontSize:14,lineHeight:21,color:"#777780",marginTop:8,marginBottom:25},
  suggestionLabel:{fontSize:10,fontWeight:"900",letterSpacing:1.2,color:"#9999A1",marginBottom:10},
  suggestion:{minHeight:49,backgroundColor:"#FFF",borderRadius:14,borderWidth:1,borderColor:"#E8E8ED",paddingHorizontal:14,paddingVertical:11,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:9},
  suggestionText:{flex:1,fontSize:13,fontWeight:"700",color:"#4A4A53"},
  messageRow:{flexDirection:"row",alignItems:"flex-end",marginBottom:14,gap:7},userRow:{justifyContent:"flex-end"},aiRow:{justifyContent:"flex-start"},
  miniIcon:{width:25,height:25,borderRadius:9,backgroundColor:"#FFECEE",alignItems:"center",justifyContent:"center",marginBottom:3},
  bubble:{maxWidth:"84%",paddingHorizontal:14,paddingVertical:11,borderRadius:18},
  userBubble:{backgroundColor:"#E60012",borderBottomRightRadius:5},aiBubble:{backgroundColor:"#FFF",borderBottomLeftRadius:5,borderWidth:1,borderColor:"#ECECF0"},
  messageText:{fontSize:14,lineHeight:21,color:"#303039"},userText:{color:"#FFF"},typing:{flexDirection:"row",alignItems:"center",gap:9},typingText:{fontSize:12,color:"#85858F"},
  composerWrap:{flexDirection:"row",alignItems:"flex-end",gap:9,marginHorizontal:14,padding:8,backgroundColor:"#FFF",borderWidth:1,borderColor:"#E6E6EB",borderRadius:21,shadowColor:"#172033",shadowOpacity:0.05,shadowRadius:10,shadowOffset:{width:0,height:3},elevation:2},
  input:{flex:1,maxHeight:115,minHeight:42,paddingHorizontal:10,paddingTop:11,paddingBottom:9,fontSize:14,color:"#25252B"},
  sendButton:{width:42,height:42,borderRadius:14,backgroundColor:"#E60012",alignItems:"center",justifyContent:"center"},sendDisabled:{backgroundColor:"#D5D5DA"},
  disclaimer:{fontSize:10,color:"#9A9AA2",textAlign:"center",paddingTop:7,paddingBottom:8},
});

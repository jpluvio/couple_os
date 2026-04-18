import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useCouple } from "@/hooks/useCouple";
import { TodoItem, type TodoItemType } from "@/components/todo/TodoItem";
import type { PriorityLevel } from "@/types/database";

type TodoList = { id: string; name: string; emoji: string | null; couple_id: string };

const LISTS_KEY = (cid: string) => ["todo-lists", cid];
const ITEMS_KEY = (listId: string) => ["todo-items", listId];

const PRIORITIES: PriorityLevel[] = ["LOW", "MEDIUM", "HIGH"];
const PRIORITY_LABELS: Record<PriorityLevel, string> = { LOW: "🟢 Bassa", MEDIUM: "🟡 Media", HIGH: "🔴 Alta" };

export default function TodoScreen() {
  const { user } = useAuth();
  const { couple } = useCouple();
  const queryClient = useQueryClient();
  const coupleId = couple?.id ?? "";

  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  // Create list modal
  const [showCreateList, setShowCreateList] = useState(false);
  const [listName, setListName] = useState("");
  const [listEmoji, setListEmoji] = useState("📝");
  const [listLoading, setListLoading] = useState(false);

  // Create item modal
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [itemTitle, setItemTitle] = useState("");
  const [itemPriority, setItemPriority] = useState<PriorityLevel>("MEDIUM");
  const [itemLoading, setItemLoading] = useState(false);

  const listsKey = LISTS_KEY(coupleId);
  const { data: lists, isLoading: listsLoading, refetch: refetchLists } = useQuery({
    queryKey: listsKey,
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("todo_lists")
        .select("*")
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as TodoList[];
    },
    select: (data) => {
      // Auto-select first list if none selected
      if (data.length > 0 && !selectedListId) {
        setSelectedListId(data[0].id);
      }
      return data;
    },
  });

  const activeListId = selectedListId ?? lists?.[0]?.id ?? null;
  const itemsKey = ITEMS_KEY(activeListId ?? "");

  const { data: items, isLoading: itemsLoading, refetch: refetchItems } = useQuery({
    queryKey: itemsKey,
    enabled: !!activeListId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("todo_items")
        .select("*, assignee:users!assignee_id(name)")
        .eq("list_id", activeListId!)
        .order("status", { ascending: true }) // TODO/IN_PROGRESS before DONE
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as TodoItemType[];
    },
  });

  async function createList() {
    if (!listName.trim() || !coupleId) return;
    setListLoading(true);
    try {
      const { data, error } = await supabase
        .from("todo_lists")
        .insert({ name: listName.trim(), emoji: listEmoji, couple_id: coupleId })
        .select()
        .single();
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: listsKey });
      setSelectedListId(data.id);
      setListName("");
      setListEmoji("📝");
      setShowCreateList(false);
    } catch {
      Alert.alert("Errore", "Impossibile creare la lista.");
    } finally {
      setListLoading(false);
    }
  }

  async function createItem() {
    if (!itemTitle.trim() || !activeListId) return;
    setItemLoading(true);
    try {
      await supabase.from("todo_items").insert({
        title: itemTitle.trim(),
        priority: itemPriority,
        list_id: activeListId,
        status: "TODO",
      });
      queryClient.invalidateQueries({ queryKey: itemsKey });
      setItemTitle("");
      setItemPriority("MEDIUM");
      setShowCreateItem(false);
    } catch {
      Alert.alert("Errore", "Impossibile aggiungere il task.");
    } finally {
      setItemLoading(false);
    }
  }

  async function deleteList(listId: string) {
    Alert.alert("Elimina lista", "Elimina la lista e tutti i task? Non è reversibile.", [
      { text: "Annulla", style: "cancel" },
      {
        text: "Elimina",
        style: "destructive",
        onPress: async () => {
          await supabase.from("todo_lists").delete().eq("id", listId);
          if (selectedListId === listId) setSelectedListId(null);
          queryClient.invalidateQueries({ queryKey: listsKey });
        },
      },
    ]);
  }

  const openCount = items?.filter((i) => i.status !== "DONE").length ?? 0;

  if (!user || !couple) return null;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-4 pt-2 pb-3 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-gray-900">To-Do</Text>
          {openCount > 0 && (
            <Text className="text-sm text-gray-500 mt-0.5">{openCount} task aperti</Text>
          )}
        </View>
        <Pressable
          onPress={() => setShowCreateList(true)}
          className="flex-row items-center bg-green-500 px-3 py-1.5 rounded-full"
          style={{ gap: 4 }}
        >
          <Text className="text-white text-sm">+</Text>
          <Text className="text-white text-xs font-semibold">Lista</Text>
        </Pressable>
      </View>

      {/* List selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="flex-grow-0"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}
      >
        {(lists ?? []).map((list) => {
          const listOpenCount = items && activeListId === list.id
            ? items.filter((i) => i.status !== "DONE").length
            : null;
          const isSelected = activeListId === list.id;
          return (
            <Pressable
              key={list.id}
              onPress={() => setSelectedListId(list.id)}
              onLongPress={() => deleteList(list.id)}
              className={`mr-2 px-4 py-2.5 rounded-2xl flex-row items-center ${
                isSelected ? "bg-green-500" : "bg-white border border-gray-200"
              }`}
              style={{ gap: 6 }}
            >
              <Text className="text-base">{list.emoji ?? "📝"}</Text>
              <Text className={`text-sm font-semibold ${isSelected ? "text-white" : "text-gray-700"}`}>
                {list.name}
              </Text>
              {listOpenCount !== null && listOpenCount > 0 && (
                <View className={`rounded-full px-1.5 min-w-5 items-center ${isSelected ? "bg-white/30" : "bg-green-500"}`}>
                  <Text className={`text-xs font-bold ${isSelected ? "text-white" : "text-white"}`}>
                    {listOpenCount}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
        {listsLoading && <ActivityIndicator color="#22c55e" />}
      </ScrollView>

      {/* Items list */}
      {activeListId ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl refreshing={itemsLoading} onRefresh={refetchItems} tintColor="#22c55e" />
          }
        >
          {(items ?? []).length === 0 && !itemsLoading ? (
            <View className="items-center py-16 px-8">
              <Text className="text-4xl mb-3">✅</Text>
              <Text className="text-base font-semibold text-gray-700 text-center">Lista vuota</Text>
              <Text className="text-sm text-gray-400 text-center mt-1">
                Aggiungi il primo task!
              </Text>
            </View>
          ) : (
            (items ?? []).map((item) => (
              <TodoItem key={item.id} item={item} currentUserId={user.id} queryKey={itemsKey} />
            ))
          )}
        </ScrollView>
      ) : (
        !listsLoading && (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-5xl mb-4">📋</Text>
            <Text className="text-lg font-semibold text-gray-700 text-center">Nessuna lista ancora</Text>
            <Text className="text-sm text-gray-400 text-center mt-1">Crea la prima lista per iniziare!</Text>
          </View>
        )
      )}

      {/* FAB — add item */}
      {activeListId && (
        <Pressable
          onPress={() => setShowCreateItem(true)}
          className="absolute bottom-8 right-6 w-14 h-14 bg-green-500 rounded-full items-center justify-center"
          style={{ shadowColor: "#22c55e", shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}
        >
          <Text className="text-white text-3xl" style={{ lineHeight: 36 }}>+</Text>
        </Pressable>
      )}

      {/* Create List Modal */}
      <Modal visible={showCreateList} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreateList(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-4 pt-5 pb-3 border-b border-gray-100">
            <Pressable onPress={() => setShowCreateList(false)} className="py-1 px-2">
              <Text className="text-base text-gray-500">Annulla</Text>
            </Pressable>
            <Text className="text-base font-semibold text-gray-900">Nuova lista</Text>
            <Pressable
              onPress={createList}
              disabled={!listName.trim() || listLoading}
              className={`py-1.5 px-4 rounded-full ${listName.trim() && !listLoading ? "bg-green-500" : "bg-gray-200"}`}
            >
              {listLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                <Text className={`text-sm font-semibold ${listName.trim() ? "text-white" : "text-gray-400"}`}>Crea</Text>
              )}
            </Pressable>
          </View>
          <View className="px-4 pt-4" style={{ gap: 12 }}>
            <View className="flex-row items-center bg-gray-50 rounded-xl px-3 py-2" style={{ gap: 8 }}>
              <TextInput
                className="text-3xl w-10"
                value={listEmoji}
                onChangeText={setListEmoji}
                maxLength={2}
              />
              <TextInput
                className="flex-1 text-base text-gray-800"
                placeholder="Nome lista"
                placeholderTextColor="#9ca3af"
                value={listName}
                onChangeText={setListName}
                autoFocus
                onSubmitEditing={createList}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Item Modal */}
      <Modal visible={showCreateItem} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreateItem(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-4 pt-5 pb-3 border-b border-gray-100">
            <Pressable onPress={() => setShowCreateItem(false)} className="py-1 px-2">
              <Text className="text-base text-gray-500">Annulla</Text>
            </Pressable>
            <Text className="text-base font-semibold text-gray-900">Nuovo task</Text>
            <Pressable
              onPress={createItem}
              disabled={!itemTitle.trim() || itemLoading}
              className={`py-1.5 px-4 rounded-full ${itemTitle.trim() && !itemLoading ? "bg-green-500" : "bg-gray-200"}`}
            >
              {itemLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                <Text className={`text-sm font-semibold ${itemTitle.trim() ? "text-white" : "text-gray-400"}`}>Aggiungi</Text>
              )}
            </Pressable>
          </View>
          <View className="px-4 pt-4" style={{ gap: 16 }}>
            <TextInput
              className="text-base text-gray-800 border-b border-gray-100 pb-3"
              placeholder="Cosa devi fare?"
              placeholderTextColor="#9ca3af"
              value={itemTitle}
              onChangeText={setItemTitle}
              autoFocus
              onSubmitEditing={createItem}
            />
            <View>
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Priorità</Text>
              <View className="flex-row" style={{ gap: 8 }}>
                {PRIORITIES.map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => setItemPriority(p)}
                    className={`flex-1 py-2 rounded-xl items-center border ${
                      itemPriority === p ? "bg-green-500 border-green-500" : "bg-white border-gray-200"
                    }`}
                  >
                    <Text className={`text-sm font-medium ${itemPriority === p ? "text-white" : "text-gray-600"}`}>
                      {PRIORITY_LABELS[p]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

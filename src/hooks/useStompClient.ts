"use client";

import { useEffect, useRef, useCallback } from "react";
import { Client, type IMessage } from "@stomp/stompjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const WS_URL = API_URL
  ? API_URL.replace("/api", "").replace(/^http/, "ws") + "/ws"
  : null;

/** Lightweight hook around a shared STOMP client. Does nothing if NEXT_PUBLIC_API_URL is not set. */
export function useStompClient() {
  const clientRef = useRef<Client | null>(null);
  const subsRef = useRef<Map<string, { id: string; unsub: () => void }>>(new Map());

  useEffect(() => {
    if (!WS_URL) return;

    const client = new Client({
      brokerURL: WS_URL,
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
    });

    client.onConnect = () => {
      /* re-subscribe after reconnect */
      subsRef.current.forEach((_val, dest) => {
        // subscriptions are restored by the caller via subscribe()
      });
    };

    client.activate();
    clientRef.current = client;

    return () => {
      subsRef.current.forEach((s) => s.unsub());
      subsRef.current.clear();
      client.deactivate();
    };
  }, []);

  const subscribe = useCallback(
    (destination: string, callback: (body: unknown) => void) => {
      const client = clientRef.current;
      if (!client?.connected) {
        /* queue – will be called once onConnect fires */
        const origOnConnect = client?.onConnect;
        if (client) {
          client.onConnect = (frame) => {
            origOnConnect?.(frame);
            doSubscribe();
          };
        }
      } else {
        doSubscribe();
      }

      function doSubscribe() {
        if (!clientRef.current?.connected) return;
        if (subsRef.current.has(destination)) return; // already subscribed

        const sub = clientRef.current.subscribe(destination, (msg: IMessage) => {
          try {
            callback(JSON.parse(msg.body));
          } catch {
            callback(msg.body);
          }
        });

        subsRef.current.set(destination, { id: sub.id, unsub: () => sub.unsubscribe() });
      }

      return () => {
        const entry = subsRef.current.get(destination);
        if (entry) {
          entry.unsub();
          subsRef.current.delete(destination);
        }
      };
    },
    [],
  );

  return { subscribe };
}

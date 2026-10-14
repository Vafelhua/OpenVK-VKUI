import { useEffect, useState, useCallback } from 'react';
import { View, Panel, Snackbar, ScreenSpinner } from '@vkontakte/vkui';
import { getToken, api, setToken, UserProfile } from './api';
import { LoginPanel } from './panels/Login';
import { FeedPanel } from './panels/Feed';
import { MessagesPanel } from './panels/Messages';
import { ChatPanel } from './panels/Chat';
import { FriendsPanel } from './panels/Friends';
import { GroupsPanel } from './panels/Groups';
import { MusicPanel } from './panels/Music';
import { ProfilePanel } from './panels/Profile';
import { UserPage } from './panels/UserPage';
import { GroupPage } from './panels/GroupPage';
import {
  IconNews,
  IconMessages,
  IconFriends,
  IconGroups,
  IconMusic,
  IconMenu,
} from './components/Icons';

export type TabId = 'feed' | 'messages' | 'friends' | 'groups' | 'music' | 'profile';

type Route =
  | { kind: 'chat'; peerId: number; title: string }
  | { kind: 'user'; userId: number }
  | { kind: 'group'; groupId: number }
  | null;

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('feed');
  const [route, setRoute] = useState<Route>(null);
  const [me, setMe] = useState<UserProfile | null>(null);
  const [authed, setAuthed] = useState<boolean>(!!getToken());
  const [snack, setSnack] = useState<string | null>(null);
  const [unreadMsg, setUnreadMsg] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!getToken()) return;
    try {
      const users = await api<UserProfile[]>('users.get', {
        fields: 'photo_200,status,online',
      });
      if (users && users[0]) setMe(users[0]);
    } catch (e: any) {
      if (e && (e.code === 5 || e.code === 270)) {
        setToken(null);
        setAuthed(false);
        setMe(null);
      }
    }
  }, []);

  const loadUnread = useCallback(async () => {
    if (!getToken()) return;
    try {
      const conv = await api<{ items: any[] }>('messages.getConversations', {
        count: 1,
        fields: 'photo_50',
      });
      let total = 0;
      if (conv && conv.items) {
        for (const c of conv.items) total += c.unread_count || 0;
      }
      setUnreadMsg(total);
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      if (getToken()) {
        setLoading(false);
        await loadMe();
        loadUnread();
      } else {
        setLoading(false);
      }
    })();
  }, [loadMe, loadUnread, authed]);

  useEffect(() => {
    if (!authed) return;
    const t = setInterval(loadUnread, 45000);
    return () => clearInterval(t);
  }, [authed, loadUnread]);

  const onAuth = useCallback(async () => {
    setAuthed(true);
    setActiveTab('feed');
    await loadMe();
    loadUnread();
  }, [loadMe, loadUnread]);

  const onLogout = useCallback(() => {
    setToken(null);
    setMe(null);
    setAuthed(false);
    setActiveTab('feed');
    setRoute(null);
  }, []);

  const openChat = useCallback((peerId: number, title: string) => {
    setRoute({ kind: 'chat', peerId, title });
  }, []);

  const openUser = useCallback((userId: number) => {
    setRoute({ kind: 'user', userId });
  }, []);

  const openGroup = useCallback((groupId: number) => {
    setRoute({ kind: 'group', groupId });
  }, []);

  const goBack = useCallback(() => {
    setRoute(null);
    loadUnread();
  }, [loadUnread]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '40vh' }}>
        <ScreenSpinner />
      </div>
    );
  }

  if (!authed) {
    return (
      <View activePanel="login">
        <Panel id="login">
          <LoginPanel onAuth={onAuth} onError={(m) => setSnack(m)} />
        </Panel>
      </View>
    );
  }

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: 'feed', label: 'Новости', icon: IconNews },
    { id: 'messages', label: 'Сообщения', icon: IconMessages },
    { id: 'friends', label: 'Друзья', icon: IconFriends },
    { id: 'groups', label: 'Сообщества', icon: IconGroups },
    { id: 'music', label: 'Музыка', icon: IconMusic },
    { id: 'profile', label: 'Ещё', icon: IconMenu },
  ];

  return (
    <div style={{ height: '100%' }}>
      {route && route.kind === 'chat' ? (
        <ChatPanel
          peerId={route.peerId}
          title={route.title}
          onBack={goBack}
          onError={(m) => setSnack(m)}
        />
      ) : route && route.kind === 'user' ? (
        <UserPage
          userId={route.userId}
          onBack={goBack}
          onOpenChat={openChat}
          onOpenUser={openUser}
          onOpenGroup={openGroup}
          onError={(m) => setSnack(m)}
        />
      ) : route && route.kind === 'group' ? (
        <GroupPage
          groupId={route.groupId}
          onBack={goBack}
          onOpenUser={openUser}
          onOpenGroup={openGroup}
          onError={(m) => setSnack(m)}
        />
      ) : (
        <View activePanel={activeTab} style={{ height: '100%' }}>
          <Panel id="feed">
            <FeedPanel
              onOpenProfile={() => setActiveTab('profile')}
              onOpenUser={openUser}
              onOpenGroup={openGroup}
              onError={(m) => setSnack(m)}
            />
          </Panel>
          <Panel id="messages">
            <MessagesPanel
              onOpenChat={openChat}
              onOpenUser={openUser}
              onError={(m) => setSnack(m)}
              meId={me?.id || 0}
            />
          </Panel>
          <Panel id="friends">
            <FriendsPanel
              onOpenChat={openChat}
              onOpenUser={openUser}
              onError={(m) => setSnack(m)}
              meId={me?.id || 0}
            />
          </Panel>
          <Panel id="groups">
            <GroupsPanel onOpenGroup={openGroup} onError={(m) => setSnack(m)} />
          </Panel>
          <Panel id="music">
            <MusicPanel onError={(m) => setSnack(m)} />
          </Panel>
          <Panel id="profile">
            <ProfilePanel me={me} onLogout={onLogout} onError={(m) => setSnack(m)} />
          </Panel>
        </View>
      )}

      <nav className="ovk-tabbar">
        {tabs.map(({ id, label, icon: IconComp }) => {
          const selected = activeTab === id && !route;
          const color = selected ? '#2688eb' : '#818c99';
          return (
            <button
              key={id}
              className={'ovk-tab' + (selected ? ' active' : '')}
              onClick={() => {
                setRoute(null);
                setActiveTab(id);
              }}
            >
              <span className="ovk-tab__icon">
                <IconComp color={color} />
              </span>
              {label}
              {id === 'messages' && unreadMsg > 0 ? (
                <span className="ovk-tab__badge">
                  {unreadMsg > 99 ? '99+' : unreadMsg}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {snack && (
        <Snackbar
          onClose={() => setSnack(null)}
          duration={4000}
          style={{
            bottom: 'calc(50px + env(safe-area-inset-bottom, 0px) + 12px)',
          }}
        >
          {snack}
        </Snackbar>
      )}
    </div>
  );
}

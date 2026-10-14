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
import { SettingsPanel, Theme } from './panels/Settings';
import { UserPage } from './panels/UserPage';
import { GroupPage } from './panels/GroupPage';
import { NotificationsPanel } from './panels/Notifications';
import { VideoPanel } from './panels/Video';
import { NotesPanel } from './panels/Notes';
import { GiftPanel } from './panels/Gifts';
import { DocsPanel } from './panels/Docs';
import { MiniPlayer } from './components/MiniPlayer';
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
  | { kind: 'settings' }
  | { kind: 'notifications' }
  | { kind: 'video' }
  | { kind: 'notes' }
  | { kind: 'gifts'; userId: number; userName: string }
  | { kind: 'docs' }
  | null;

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('feed');
  const [route, setRoute] = useState<Route>(null);
  const [me, setMe] = useState<UserProfile | null>(null);
  const [authed, setAuthed] = useState<boolean>(!!getToken());
  const [snack, setSnack] = useState<string | null>(null);
  const [unreadMsg, setUnreadMsg] = useState(0);
  const [msgVersion, setMsgVersion] = useState(0);
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [loading, setLoading] = useState(true);
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      return (localStorage.getItem('ovk_theme') as Theme) || 'light';
    } catch {
      return 'light';
    }
  });

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem('ovk_theme', t);
    } catch {}
    if (t === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, []);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

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
      const conv = await api<any>('messages.getConversations', {
        count: 1,
        fields: 'photo_50',
      });
      let total = 0;
      const items = Array.isArray(conv) ? conv : conv && Array.isArray(conv.items) ? conv.items : [];
      for (const c of items) total += (c && c.unread_count) || 0;
      setUnreadMsg(total);
    } catch {}
    try {
      const c = await api<any>('account.getCounters', {});
      if (c && typeof c.notifications === 'number') setUnreadNotif(c.notifications);
      else setUnreadNotif(0);
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

  useEffect(() => {
    if (!authed || !getToken()) return;
    let stopped = false;
    let ts = '';
    let key = '';
    let server = '';

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const init = async () => {
      try {
        const lp = await api<any>('messages.getLongPollServer', { lp_version: 3, need_pts: 0 });
        if (lp && lp.server && lp.key) {
          server = String(lp.server).replace(/^https?:\/\//, '');
          key = lp.key;
          ts = lp.ts;
        }
      } catch {}
    };

    const loop = async () => {
      while (!stopped) {
        if (!server) {
          await init();
          if (!server) {
            await sleep(15000);
            continue;
          }
        }
        try {
          const url =
            'https://' +
            server +
            '?act=a_check&key=' +
            encodeURIComponent(key) +
            '&ts=' +
            encodeURIComponent(ts) +
            '&wait=25&version=3';
          const res = await fetch(url, { cache: 'no-store' });
          const data = await res.json();
          if (data.failed) {
            if (data.failed === 1 || data.failed === 4) {
              if (data.ts) ts = data.ts;
            } else if (data.failed === 3) {
              server = '';
            } else {
              server = '';
            }
            continue;
          }
          if (data.ts) ts = data.ts;
          const updates: any[] = Array.isArray(data.updates) ? data.updates : [];
          let newMessage = false;
          for (const u of updates) {
            if (Array.isArray(u) && u[0] === 4) newMessage = true;
          }
          if (newMessage) {
            loadUnread();
            setMsgVersion((v) => v + 1);
          }
        } catch {
          server = '';
          await sleep(10000);
        }
      }
    };

    loop();
    return () => {
      stopped = true;
    };
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
          refreshKey={msgVersion}
        />
      ) : route && route.kind === 'user' ? (
        <UserPage
          userId={route.userId}
          meId={me?.id || 0}
          onBack={goBack}
          onOpenChat={openChat}
          onOpenUser={openUser}
          onOpenGroup={openGroup}
          onOpenGifts={(uid, uname) => setRoute({ kind: 'gifts', userId: uid, userName: uname })}
          onError={(m) => setSnack(m)}
        />
      ) : route && route.kind === 'gifts' ? (
        <GiftPanel
          userId={route.userId}
          userName={route.userName}
          onBack={goBack}
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
      ) : route && route.kind === 'settings' ? (
        <SettingsPanel
          me={me}
          theme={theme}
          setTheme={setTheme}
          onBack={goBack}
          onLogout={onLogout}
          onError={(m) => setSnack(m)}
        />
      ) : route && route.kind === 'notifications' ? (
        <NotificationsPanel
          onBack={goBack}
          onOpenUser={openUser}
          onOpenGroup={openGroup}
          onError={(m) => setSnack(m)}
        />
      ) : route && route.kind === 'video' ? (
        <VideoPanel onBack={goBack} onError={(m) => setSnack(m)} />
      ) : route && route.kind === 'notes' ? (
        <NotesPanel onBack={goBack} userId={me?.id || 0} onError={(m) => setSnack(m)} />
      ) : route && route.kind === 'docs' ? (
        <DocsPanel onBack={goBack} onError={(m) => setSnack(m)} />
      ) : (
        <View activePanel={activeTab} style={{ height: '100%' }}>
          <Panel id="feed">
            <FeedPanel
              meId={me?.id || 0}
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
              refreshKey={msgVersion}
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
            <MusicPanel onError={(m) => setSnack(m)} meId={me?.id || 0} />
          </Panel>
          <Panel id="profile">
            <ProfilePanel
              me={me}
              onOpenMyPage={() => {
                if (me && me.id) openUser(me.id);
              }}
              onOpenSettings={() => setRoute({ kind: 'settings' })}
              onOpenNotifications={() => setRoute({ kind: 'notifications' })}
              onOpenVideo={() => setRoute({ kind: 'video' })}
              onOpenNotes={() => setRoute({ kind: 'notes' })}
              onOpenDocs={() => setRoute({ kind: 'docs' })}
              onLogout={onLogout}
              onError={(m) => setSnack(m)}
            />
          </Panel>
        </View>
      )}

      <MiniPlayer onOpenMusic={() => { setRoute(null); setActiveTab('music'); }} />

      {!route && (
        <nav className="ovk-tabbar">
          {tabs.map(({ id, label, icon: IconComp }) => {
            const selected = activeTab === id;
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
                {(id === 'messages' && unreadMsg > 0) || (id === 'profile' && unreadNotif > 0) ? (
                  <span className="ovk-tab__badge">
                    {(id === 'messages' ? unreadMsg : unreadNotif) > 99
                      ? '99+'
                      : id === 'messages'
                        ? unreadMsg
                        : unreadNotif}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      )}

      {snack && (
        <Snackbar
          onClose={() => setSnack(null)}
          duration={4000}
          style={{ bottom: route ? '24px' : 'calc(50px + env(safe-area-inset-bottom, 0px) + 12px)' }}
        >
          {snack}
        </Snackbar>
      )}
    </div>
  );
}

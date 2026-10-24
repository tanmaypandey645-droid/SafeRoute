import React, { useState, useEffect } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import {
  HazardReport,
  PedestrianRoute,
  UserRole,
  NotificationItem,
} from './types/index.ts';
import { Header } from './components/Header.tsx';
import { RoutePlanner } from './components/RoutePlanner.tsx';
import { RouteComparison } from './components/RouteComparison.tsx';
import { CommunityReports } from './components/CommunityReports.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { RouteMonitoringView } from './components/RouteMonitoringView.tsx';
import { ReportHazardModal } from './components/ReportHazardModal.tsx';
import { HazardDetailModal } from './components/HazardDetailModal.tsx';
import { NotificationsModal } from './components/NotificationsModal.tsx';
import { WelcomeIntroModal } from './components/WelcomeIntroModal.tsx';
import { IntroVideoScreen } from './components/IntroVideoScreen.tsx';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('planner');
  const [userRole, setUserRole] = useState<UserRole>('citizen');
  const [userName, setUserName] = useState<string>('Maya Lin');
  const [userId, setUserId] = useState<string>('usr_citizen_1');

  // Intro video: plays whenever anyone opens this app
  const [showIntroVideo, setShowIntroVideo] = useState<boolean>(true);

  // Reports state
  const [reports, setReports] = useState<HazardReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);

  // Computed routes for comparison
  const [comparisonRoutes, setComparisonRoutes] = useState<PedestrianRoute[]>([]);

  // Modals state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportModalCoords, setReportModalCoords] = useState<[number, number] | null>(null);

  const [selectedReport, setSelectedReport] = useState<HazardReport | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Intro modal: opens after video or can be toggled anytime in Header
  const [isIntroOpen, setIsIntroOpen] = useState<boolean>(false);

  // Top-level Google Maps Platform Demo Key quota state
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState<boolean>(false);

  useEffect(() => {
    const handleQuotaExceeded = () => {
      setGmpQuotaExceeded(true);
    };
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => {
      window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    };
  }, []);

  // Dark mode state with persistence & system preference check
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        return savedTheme === 'dark';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Sync user info when role changes
  const handleRoleChange = (role: UserRole) => {
    setUserRole(role);
    if (role === 'verifier') {
      setUserName('Officer David Vance');
      setUserId('usr_verifier_1');
    } else if (role === 'admin') {
      setUserName('Elena Rostova');
      setUserId('usr_admin_1');
    } else {
      setUserName('Maya Lin');
      setUserId('usr_citizen_1');
    }
  };

  // Load reports from server
  const loadReports = async () => {
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setIsLoadingReports(false);
    }
  };

  // Load notifications
  const loadNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    loadReports();
    loadNotifications();
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllNotificationsRead = async () => {
    try {
      await fetch('/api/notifications/mark-read', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleReportCreated = (newReport: HazardReport) => {
    setReports((prev) => [newReport, ...prev]);
    loadNotifications();
  };

  const handleReportUpdated = (updatedReport: HazardReport) => {
    setReports((prev) => prev.map((r) => (r.id === updatedReport.id ? updatedReport : r)));
    setSelectedReport(updatedReport);
    loadNotifications();
  };

  const handleOpenDetailModal = (report: HazardReport) => {
    setSelectedReport(report);
    setIsDetailModalOpen(true);
  };

  return (
    <APIProvider
      apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}
      language="en"
      region="IN"
    >
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
        {gmpQuotaExceeded && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
            <span>
              Google Maps Platform quota reached. If you are the app owner, visit{' '}
              <a
                href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold text-amber-950 hover:text-amber-800"
              >
                maps developer site
              </a>{' '}
              for instructions to update your account.
            </span>
          </div>
        )}
        {/* Top Bar Navigation */}
        <Header
        currentTab={currentTab}
        onTabChange={(tab) => {
          if (tab === 'report') {
            setIsReportModalOpen(true);
          } else {
            setCurrentTab(tab);
          }
        }}
        userRole={userRole}
        onRoleChange={handleRoleChange}
        unreadNotificationsCount={unreadCount}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        onOpenIntro={() => setIsIntroOpen(true)}
        onReplayVideo={() => setShowIntroVideo(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentTab === 'planner' && (
          <RoutePlanner
            hazards={reports}
            onSelectHazard={handleOpenDetailModal}
            onOpenReportModalWithCoords={(lat, lng) => {
              setReportModalCoords([lat, lng]);
              setIsReportModalOpen(true);
            }}
            onNavigateToComparison={(routes) => {
              setComparisonRoutes(routes);
              setCurrentTab('compare');
            }}
            isDarkMode={isDarkMode}
          />
        )}

        {currentTab === 'compare' && (
          <RouteComparison
            routes={comparisonRoutes}
            onSelectRouteForMap={(routeId) => {
              setCurrentTab('planner');
            }}
          />
        )}

        {currentTab === 'community' && (
          <CommunityReports
            reports={reports}
            onSelectReport={handleOpenDetailModal}
            onRefreshReports={loadReports}
            userRole={userRole}
            userName={userName}
          />
        )}

        {currentTab === 'admin' && (
          <AdminDashboard
            userRole={userRole}
            userName={userName}
            reports={reports}
            onRefreshData={loadReports}
            onOpenReportDetail={handleOpenDetailModal}
          />
        )}

        {currentTab === 'monitoring' && (
          <RouteMonitoringView
            userRole={userRole}
            userName={userName}
            userId={userId}
            onRefreshAll={() => {
              loadReports();
              loadNotifications();
            }}
          />
        )}
      </main>

      {/* Report Hazard Modal */}
      <ReportHazardModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setReportModalCoords(null);
        }}
        onReportCreated={handleReportCreated}
        initialCoords={reportModalCoords}
        userRole={userRole}
        userName={userName}
        userId={userId}
        existingHazards={reports}
      />

      {/* Hazard Detail Modal */}
      <HazardDetailModal
        report={selectedReport}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedReport(null);
        }}
        userRole={userRole}
        userName={userName}
        userId={userId}
        onReportUpdated={handleReportUpdated}
        onOpenAdminAction={(report, action) => {
          setIsDetailModalOpen(false);
          setCurrentTab('admin');
        }}
      />

      {/* Notifications Drawer Modal */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAllRead={handleMarkAllNotificationsRead}
        onSelectReportById={(id) => {
          const match = reports.find((r) => r.id === id);
          if (match) {
            handleOpenDetailModal(match);
          }
        }}
      />

      {/* Intro Video Screen (plays whenever anyone opens the app) */}
      <IntroVideoScreen
        isOpen={showIntroVideo}
        onComplete={() => {
          setShowIntroVideo(false);
          // Show the feature guide modal after video on first launch if preferred
          const savedPref = localStorage.getItem('saferoute_show_intro');
          if (savedPref !== 'false') {
            setIsIntroOpen(true);
          }
        }}
      />

      {/* App Opening Welcome & Feature Intro Modal */}
      <WelcomeIntroModal
        isOpen={isIntroOpen}
        onClose={() => setIsIntroOpen(false)}
        onLaunchDemoRoute={() => {
          setCurrentTab('planner');
        }}
        onWatchIntroVideo={() => setShowIntroVideo(true)}
      />
      </div>
    </APIProvider>
  );
}

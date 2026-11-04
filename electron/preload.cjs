const { contextBridge, ipcRenderer } = require("electron");

function subscribe(channel, callback) {
  if (typeof callback !== "function") return () => {};
  const wrapped = (_event, data) => callback(data);
  ipcRenderer.on(channel, wrapped);
  return () => ipcRenderer.removeListener(channel, wrapped);
}

contextBridge.exposeInMainWorld("electronAPI", {
  minimizeWindow: () => ipcRenderer.send("window-minimize"),
  maximizeWindow: () => ipcRenderer.send("window-maximize"),
  closeWindow: () => ipcRenderer.send("window-close"),
  isMaximized: () => ipcRenderer.invoke("window-is-maximized"),
  /**
   * @param {(maximized: boolean) => void} callback
   * @returns {() => void} unsubscribe
   */
  subscribeWindowMaximized: (callback) => {
    const onMax = () => callback(true);
    const onUnmax = () => callback(false);
    ipcRenderer.on("window-maximized", onMax);
    ipcRenderer.on("window-unmaximized", onUnmax);
    return () => {
      ipcRenderer.removeListener("window-maximized", onMax);
      ipcRenderer.removeListener("window-unmaximized", onUnmax);
    };
  },
});

// The renderer talks to the app only through window.studyHub. In a plain browser the demo bridge installs the same shape.
contextBridge.exposeInMainWorld("studyHub", {
  platform: process.platform,
  mode: "live",
  openExternal: (url) => ipcRenderer.invoke("projector:open-external", url),
  /** Text of a PDF or Word file the student picked: `{ name, bytes: ArrayBuffer }` → `{ ok, text }`. */
  extractFile: (file) => ipcRenderer.invoke("projector:extract-file", file),

  app: {
    info: () => ipcRenderer.invoke("app:info"),
    backup: {
      create: () => ipcRenderer.invoke("app:backup:create"),
      restore: () => ipcRenderer.invoke("app:backup:restore"),
      /** @returns {Promise<{ last: string|null, count: number, dir: string }>} */
      status: () => ipcRenderer.invoke("app:backup:status"),
      now: () => ipcRenderer.invoke("app:backup:now"),
      openFolder: () => ipcRenderer.invoke("app:backup:openFolder"),
    },
  },
  /** The SOURCE public club list, read signed out: `{ ok, source: "the-source", rows, at, stale?, error? }`. */
  clubs: {
    list: () => ipcRenderer.invoke("source:clubs"),
  },
  /** Next 14 days from The SOURCE and UA's calendar, signed out: `{ ok, source: "live", sourceRows, calendarRows, stale, down }`. */
  events: {
    list: () => ipcRenderer.invoke("campus:events"),
  },
  blackboard: {
    /** Connect: opens the sign-in window (closes itself once signed in), or just syncs if already connected. */
    open: () => ipcRenderer.invoke("bb:open"),
    /** Opens a *.blackboard.com URL in the signed-in Blackboard window. */
    openUrl: (url) => ipcRenderer.invoke("bb:open-url", url),
    close: () => ipcRenderer.invoke("bb:close"),
    /** Signs out, wipes the session and everything mirrored from Blackboard. */
    disconnect: () => ipcRenderer.invoke("bb:disconnect"),
    getStatus: () => ipcRenderer.invoke("bb:getStatus"),
    /** @returns {Promise<{ ok: boolean, courses?: Array, error?: string }>} */
    listCourses: () => ipcRenderer.invoke("bb:list-courses"),
    /** @returns {Promise<{ ok: boolean, counts?: object, error?: string }>} */
    syncCourse: (data) => ipcRenderer.invoke("bb:sync-course", data),
    /** @returns {() => void} unsubscribe */
    onSyncProgress: (callback) => subscribe("bb:sync-progress", callback),
    /** @returns {() => void} unsubscribe */
    onSyncComplete: (callback) => subscribe("bb:sync-complete", callback),
    /** @returns {() => void} unsubscribe */
    onSyllabus: (callback) => subscribe("bb:syllabus", callback),
    /** @returns {() => void} unsubscribe */
    onConnected: (callback) => subscribe("bb:connected", callback),
    /** @returns {() => void} unsubscribe */
    onDisconnected: (callback) => subscribe("bb:disconnected", callback),
  },
  db: {
    courses: {
      getAll: () => ipcRenderer.invoke("db:courses:getAll"),
      get: (uuid) => ipcRenderer.invoke("db:courses:get", uuid),
      getFull: (uuid) => ipcRenderer.invoke("db:courses:getFull", uuid),
      saveFull: (payload) => ipcRenderer.invoke("db:courses:saveFull", payload),
      delete: (courseUuid) => ipcRenderer.invoke("db:courses:delete", courseUuid),
    },
    notes: {
      save: (data) => ipcRenderer.invoke("db:notes:save", data),
    },
    flashcards: {
      /** `{ courseUuid, uuid, front, back }`; inserts or edits one card. */
      save: (data) => ipcRenderer.invoke("db:flashcards:save", data),
      delete: (uuid) => ipcRenderer.invoke("db:flashcards:delete", uuid),
    },
    mastery: {
      /** `{ flashcardUuid, grade, easeFactor, intervalDays, repetitions, nextReview }` from sm2. */
      update: (data) => ipcRenderer.invoke("db:mastery:update", data),
    },
    settings: {
      get: (key) => ipcRenderer.invoke("db:settings:get", key),
      set: (data) => ipcRenderer.invoke("db:settings:set", data),
    },
    grades: {
      getComponents: (courseUuid) => ipcRenderer.invoke("db:grades:getComponents", courseUuid),
      saveComponents: (data) => ipcRenderer.invoke("db:grades:saveComponents", data),
      upsertEntry: (data) => ipcRenderer.invoke("db:grades:upsertEntry", data),
      getSubEntries: (componentId) => ipcRenderer.invoke("db:grades:getSubEntries", componentId),
      saveSubEntry: (data) => ipcRenderer.invoke("db:grades:saveSubEntry", data),
      deleteSubEntry: (id) => ipcRenderer.invoke("db:grades:deleteSubEntry", id),
      saveGradingScale: (data) => ipcRenderer.invoke("db:grades:saveGradingScale", data),
      getGradingScale: (courseUuid) => ipcRenderer.invoke("db:grades:getGradingScale", courseUuid),
    },
    assignments: {
      getByCourse: (courseUuid) => ipcRenderer.invoke("db:assignments:getByCourse", courseUuid),
      getRange: (range) => ipcRenderer.invoke("db:assignments:getRange", range),
      save: (data) => ipcRenderer.invoke("db:assignments:save", data),
      setCompleted: (data) => ipcRenderer.invoke("db:assignments:setCompleted", data),
      delete: (uuid) => ipcRenderer.invoke("db:assignments:delete", uuid),
    },
    announcements: {
      getByCourse: (courseUuid) => ipcRenderer.invoke("db:announcements:getByCourse", courseUuid),
      markRead: (uuid) => ipcRenderer.invoke("db:announcements:markRead", uuid),
    },
    bb: {
      getItems: (courseUuid) => ipcRenderer.invoke("db:bb:getItems", courseUuid),
      getGradeItems: (courseUuid) => ipcRenderer.invoke("db:bb:getGradeItems", courseUuid),
      setItemComponent: (data) => ipcRenderer.invoke("db:bb:setItemComponent", data),
      applyGrades: (courseUuid) => ipcRenderer.invoke("db:bb:applyGrades", courseUuid),
    },
    dashboard: {
      get: () => ipcRenderer.invoke("db:dashboard:get"),
    },
    today: {
      get: (args) => ipcRenderer.invoke("db:today:get", args),
      setTargetGrade: (data) => ipcRenderer.invoke("db:courses:setTargetGrade", data),
    },
  },
});

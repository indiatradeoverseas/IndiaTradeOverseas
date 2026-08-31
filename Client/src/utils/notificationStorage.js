export function getReadNotificationIds() {
  try {
    return JSON.parse(localStorage.getItem('crm_read_notifications') || '[]');
  } catch {
    return [];
  }
}

export function saveReadNotificationId(id) {
  if (!id) return;
  try {
    const read = getReadNotificationIds();
    if (!read.includes(id)) {
      read.push(id);
      localStorage.setItem('crm_read_notifications', JSON.stringify(read));
    }
  } catch (e) {
    console.warn(e);
  }
}

export function saveAllReadNotificationIds(ids = []) {
  try {
    const read = getReadNotificationIds();
    const set = new Set([...read, ...ids]);
    localStorage.setItem('crm_read_notifications', JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn(e);
  }
}

export function getDeletedNotificationIds() {
  try {
    return JSON.parse(localStorage.getItem('crm_deleted_notifications') || '[]');
  } catch {
    return [];
  }
}

export function saveDeletedNotificationId(id) {
  if (!id) return;
  try {
    const deleted = getDeletedNotificationIds();
    if (!deleted.includes(id)) {
      deleted.push(id);
      localStorage.setItem('crm_deleted_notifications', JSON.stringify(deleted));
    }
  } catch (e) {
    console.warn(e);
  }
}

export function saveAllDeletedNotificationIds(ids = []) {
  try {
    const deleted = getDeletedNotificationIds();
    const set = new Set([...deleted, ...ids]);
    localStorage.setItem('crm_deleted_notifications', JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn(e);
  }
}

export function processNotifications(rawNotifications = []) {
  const readIds = getReadNotificationIds();
  const deletedIds = getDeletedNotificationIds();

  return rawNotifications
    .filter(n => !deletedIds.includes(n._id))
    .map(n => ({
      ...n,
      isRead: n.isRead || readIds.includes(n._id)
    }));
}

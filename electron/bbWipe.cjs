/**
 * Makes the app look never connected to Blackboard: every course linked to Blackboard (and the rows
 * under it), the mirrored grade and content tables, and any Blackboard ids saved in settings.
 * Kept free of `electron` imports so it can be tested with a plain in-memory database.
 */
function wipeBlackboardData(db) {
  const tx = db.transaction(() => {
    const linked = db.prepare("SELECT uuid FROM courses WHERE bb_course_id IS NOT NULL AND bb_course_id != ''").all();
    for (const { uuid } of linked) {
      db.prepare("DELETE FROM settings WHERE key = ?").run(`grading_scale_${uuid}`);
      db.prepare("DELETE FROM courses WHERE uuid = ?").run(uuid);
    }
    db.prepare("DELETE FROM bb_items").run();
    db.prepare("DELETE FROM bb_grade_items").run();
    db.prepare("DELETE FROM assignments WHERE source = 'blackboard'").run();
    db.prepare("DELETE FROM announcements WHERE course_id NOT IN (SELECT id FROM courses)").run();
    db.prepare("DELETE FROM settings WHERE key LIKE 'bb.%' OR key LIKE 'blackboard%' OR key = 'fd.lastVisit'").run();
  });
  tx();
}

module.exports = { wipeBlackboardData };

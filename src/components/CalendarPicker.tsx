import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}
function isoDate(d: Date) {
  return d.toISOString().split('T')[0];
}
function sameDay(a: Date, b: Date) {
  return isoDate(a) === isoDate(b);
}

export interface DateRange {
  start: Date;
  end: Date;
}

interface Props {
  visible: boolean;
  anchorTop: number;   // Y position of anchor button (from top of screen)
  anchorRight: number; // distance from right edge of screen
  onClose: () => void;
  onConfirm: (range: DateRange) => void;
  initialRange?: DateRange;
}

export function CalendarPicker({ visible, anchorTop, anchorRight, onClose, onConfirm, initialRange }: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selecting, setSelecting] = useState<'start' | 'end'>('start');
  const [start, setStart] = useState<Date | null>(initialRange?.start ?? null);
  const [end, setEnd] = useState<Date | null>(initialRange?.end ?? null);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleDay = (day: number) => {
    const picked = new Date(viewYear, viewMonth, day);
    if (picked > today) return;
    if (selecting === 'start') {
      setStart(picked);
      setEnd(null);
      setSelecting('end');
    } else {
      if (start && picked < start) {
        setEnd(start);
        setStart(picked);
      } else {
        setEnd(picked);
      }
      setSelecting('start');
    }
  };

  const handleConfirm = () => {
    if (start) {
      onConfirm({ start, end: end ?? start });
    }
  };

  const firstDay = new Date(viewYear, viewMonth, 1);
  const totalDays = daysInMonth(viewYear, viewMonth);
  let offset = firstDay.getDay() - 1;
  if (offset < 0) offset = 6;

  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const isStart = (d: number) => !!(start && sameDay(new Date(viewYear, viewMonth, d), start));
  const isEnd = (d: number) => !!(end && sameDay(new Date(viewYear, viewMonth, d), end));
  const isBetween = (d: number) => {
    if (!start || !end) return false;
    const dt = new Date(viewYear, viewMonth, d);
    return dt > start && dt < end;
  };
  const isToday = (d: number) => sameDay(new Date(viewYear, viewMonth, d), today);
  const isFuture = (d: number) => new Date(viewYear, viewMonth, d) > today;

  // popover appears just below the button
  const popoverTop = anchorTop + 44;
  const POPOVER_W = 256;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* full-screen tap-away */}
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

      {/* popover positioned near button */}
      <View style={[styles.popover, { top: popoverTop, right: anchorRight }]}>
        {/* arrow */}
        <View style={styles.arrow} />

        {/* month nav */}
        <View style={styles.nav}>
          <Pressable onPress={prevMonth} style={styles.navBtn}>
            <Text style={styles.navArrow}>‹</Text>
          </Pressable>
          <Text style={styles.navTitle}>{MONTHS[viewMonth]} {viewYear}</Text>
          <Pressable onPress={nextMonth} style={styles.navBtn}>
            <Text style={styles.navArrow}>›</Text>
          </Pressable>
        </View>

        {/* weekday labels */}
        <View style={styles.row}>
          {WEEKDAYS.map(d => (
            <Text key={d} style={styles.wdLabel}>{d}</Text>
          ))}
        </View>

        {/* day grid */}
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.row}>
            {week.map((d, di) => {
              if (!d) return <View key={di} style={styles.dayCell} />;
              const sel = isStart(d) || isEnd(d);
              const bet = isBetween(d);
              const fut = isFuture(d);
              const tod = isToday(d);
              return (
                <Pressable
                  key={di}
                  onPress={() => handleDay(d)}
                  disabled={fut}
                  style={[
                    styles.dayCell,
                    bet && styles.dayCellBet,
                    sel && styles.dayCellSel,
                  ]}
                >
                  <Text style={[
                    styles.dayText,
                    tod && !sel && styles.dayTextToday,
                    sel && styles.dayTextSel,
                    fut && styles.dayTextFuture,
                  ]}>
                    {d}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}

        {/* selection label */}
        <Text style={styles.selLabel}>
          {start
            ? `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${end && !sameDay(start, end) ? ` → ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}`
            : selecting === 'start' ? 'Select start date' : 'Select end date'}
        </Text>

        {/* actions */}
        <View style={styles.actions}>
          <Pressable style={styles.btnCancel} onPress={onClose}>
            <Text style={styles.btnCancelText}>Cancel</Text>
          </Pressable>
          <Pressable style={[styles.btnApply, !start && { opacity: 0.4 }]} onPress={handleConfirm} disabled={!start}>
            <Text style={styles.btnApplyText}>Apply</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  popover: {
    position: 'absolute',
    width: 256,
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 20,
  },
  arrow: {
    position: 'absolute',
    top: -6,
    right: 12,
    width: 12,
    height: 12,
    backgroundColor: 'white',
    transform: [{ rotate: '45deg' }],
    shadowColor: '#000',
    shadowOffset: { width: -1, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  navBtn: {
    width: 28, height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(31,107,77,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrow: { fontSize: 18, color: '#1A8044', fontWeight: '700', lineHeight: 20 },
  navTitle: { fontSize: 13, fontWeight: '700', color: '#0F2218' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  wdLabel: {
    width: 32, height: 18,
    textAlign: 'center',
    lineHeight: 18,
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(15,34,24,0.35)',
  },
  dayCell: {
    width: 32, height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSel: { backgroundColor: '#1A8044' },
  dayCellBet: { backgroundColor: 'rgba(31,107,77,0.1)', borderRadius: 0 },
  dayText: { fontSize: 12, fontWeight: '500', color: '#0F2218' },
  dayTextToday: { color: '#1A8044', fontWeight: '700' },
  dayTextSel: { color: 'white', fontWeight: '700' },
  dayTextFuture: { color: 'rgba(15,34,24,0.22)' },
  selLabel: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#1A8044',
    marginTop: 8,
    marginBottom: 4,
  },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btnCancel: {
    flex: 1, paddingVertical: 9, borderRadius: 12,
    backgroundColor: 'rgba(31,107,77,0.07)',
    alignItems: 'center',
  },
  btnCancelText: { fontSize: 13, fontWeight: '600', color: 'rgba(15,34,24,0.55)' },
  btnApply: {
    flex: 1, paddingVertical: 9, borderRadius: 12,
    backgroundColor: '#1A8044',
    alignItems: 'center',
  },
  btnApplyText: { fontSize: 13, fontWeight: '700', color: 'white' },
});

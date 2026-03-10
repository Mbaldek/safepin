import { readFileSync, writeFileSync } from 'fs';

let c = readFileSync('src/components/trip/TripView.tsx', 'utf8');

// 1. Remove 'walk' from AppState union
c = c.replace('"idle" | "walk" | "planifier"', '"idle" | "planifier"');

// 2. Remove WalkSubState type
c = c.replace('\ntype WalkSubState = "intro" | "notifying" | "responding" | "active";\n', '\n');

// 3. Remove CircleContact type (lines 50-54)
c = c.replace(
`type CircleContact = {
  id: string;
  name: string;
  avatar_url: string | null;
};

`,
'');

// 4. Add setShowWalkWithMe
c = c.replace(
  'const setActiveRoute = useStore((s) => s.setActiveRoute);\n  const pins = useStore((s) => s.pins);',
  'const setActiveRoute = useStore((s) => s.setActiveRoute);\n  const setShowWalkWithMe = useStore((s) => s.setShowWalkWithMe);\n  const pins = useStore((s) => s.pins);'
);

// 5. Remove walkSubState state
c = c.replace('\n  const [walkSubState, setWalkSubState] = useState<WalkSubState>("intro");', '');

// 6. Remove circleContacts state
c = c.replace('\n  const [circleContacts, setCircleContacts] = useState<CircleContact[]>([]);', '');

// 7. Remove sharingStoppedLocal state
c = c.replace('\n  const [sharingStoppedLocal, setSharingStoppedLocal] = useState(false);', '');

// 8. Remove countdownSeconds state
c = c.replace('\n  const [countdownSeconds, setCountdownSeconds] = useState(107);', '');

// 9. Remove contactStatuses state
c = c.replace('\n  const [contactStatuses, setContactStatuses] = useState<Record<string, string>>({});', '');

// 10. Remove CONTACT_COLORS
c = c.replace('\n  const CONTACT_COLORS = [colors.purple, colors.cyan, colors.gold, colors.success, "#60A5FA", "#F97316"];\n', '\n');

// 11. Remove countdown useEffect (walkSubState)
const countdownEffect = `
  // Countdown for notifying state
  useEffect(() => {
    if (walkSubState === "notifying" || walkSubState === "responding") {
      const interval = setInterval(() => {
        setCountdownSeconds((s) => Math.max(0, s - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [walkSubState]);
`;
c = c.replace(countdownEffect, '\n');

// 12. Remove fetch circle contacts useEffect
const circleEffect = `
  // Fetch circle contacts
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: contacts } = await supabase
        .from("trusted_contacts")
        .select("user_id, contact_id")
        .or(\`user_id.eq.\${userId},contact_id.eq.\${userId}\`)
        .eq("status", "accepted");
      if (!contacts?.length) { setCircleContacts([]); return; }
      const contactIds = contacts.map((c) =>
        c.user_id === userId ? c.contact_id : c.user_id
      );
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, first_name, last_name, avatar_url")
        .in("id", contactIds);
      if (profiles) {
        setCircleContacts(
          profiles.map((p) => ({
            id: p.id,
            name:
              [p.first_name, p.last_name].filter(Boolean).join(" ") ||
              (p.display_name as string) ||
              "Contact",
            avatar_url: (p.avatar_url as string) || null,
          }))
        );
      }
    })();
  }, [userId]);
`;
c = c.replace(circleEffect, '\n');

// 13. Remove simulate contact responses useEffect
const simulateEffect = `
  // Simulate contact responses (using real circle contact IDs)
  useEffect(() => {
    if (walkSubState !== "notifying" || circleContacts.length === 0) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (circleContacts[0]) {
      timers.push(
        setTimeout(() => {
          setContactStatuses((prev) => ({ ...prev, [circleContacts[0].id]: "following" }));
        }, 1500)
      );
    }
    if (circleContacts[1]) {
      timers.push(
        setTimeout(() => {
          setContactStatuses((prev) => ({ ...prev, [circleContacts[1].id]: "vocal" }));
          setWalkSubState("responding");
        }, 3000)
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [walkSubState, circleContacts]);
`;
c = c.replace(simulateEffect, '\n');

// 14. Remove handleWalkCTA function
const handleWalkCTAStart = '\n  const handleWalkCTA = async () => {';
const handleWalkCTAEnd = '  };\n\n  const resetWalk';
const idx1 = c.indexOf(handleWalkCTAStart);
const idx2 = c.indexOf(handleWalkCTAEnd);
if (idx1 !== -1 && idx2 !== -1) {
  c = c.slice(0, idx1) + '\n\n  const resetWalk' + c.slice(idx2 + handleWalkCTAEnd.length);
}

// 15. Remove resetWalk function
const resetWalkFn = `
  const resetWalk = () => {
    setWalkSubState("intro");
    const initial: Record<string, string> = {};
    circleContacts.forEach((c) => { initial[c.id] = "waiting"; });
    setContactStatuses(initial);
    setCountdownSeconds(107);
    setSharingStoppedLocal(false);
  };
`;
c = c.replace(resetWalkFn, '\n');

writeFileSync('src/components/trip/TripView.tsx', c);
console.log('Done. Lines:', c.split('\n').length);

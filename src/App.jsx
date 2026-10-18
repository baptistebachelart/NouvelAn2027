import React, { useState, useEffect, useRef } from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut
} from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  addDoc
} from "firebase/firestore";
import confetti from "canvas-confetti";
import {
  Sparkles,
  MessageCircle,
  Camera,
  Utensils,
  BedDouble,
  Calendar,
  Info,
  MapPin,
  Wifi,
  Copy,
  Check,
  LogOut,
  Plus,
  Trash2,
  ExternalLink,
  Users,
  Car,
  Music,
  Wallet,
  Settings,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Phone,
  Home,
  Edit3,
  Flame,
  Snowflake,
  RefreshCw,
  Baby
} from "lucide-react";
import { auth, db } from "./firebase";
import {
  GITE_INFO,
  INITIAL_FAMILIES,
  FRIEND_COUPLE_PRESETS,
  INITIAL_ROOMS,
  INITIAL_MEALS,
  INITIAL_GROCERIES,
  INITIAL_ACTIVITIES
} from "./data/giteData";

function computeTimeLeft(targetIso) {
  const diff = new Date(targetIso).getTime() - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / 1000 / 60) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    expired: false
  };
}

const DEFAULT_CATEGORY_IMAGES = {
  "Sport & Aventure": "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=1000&q=80",
  "Rando & Nature": "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1000&q=80",
  "Visite & Patrimoine": "https://upload.wikimedia.org/wikipedia/commons/7/7e/Ch%C3%A2teau_Najac.jpg",
  "Terroir & Gastronomie": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Bol_d%27aligot.jpg/1280px-Bol_d%27aligot.jpg",
  "Sur place au Château": "https://a0.muscache.com/im/pictures/bb692ecc-305a-4986-84bf-876ade3c9b58.jpg?im_w=1200"
};

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [originCity, setOriginCity] = useState("Lyon");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  // Navigation
  const [activeTab, setActiveTab] = useState("home");
  const [heroIndex, setHeroIndex] = useState(0);
  const [copiedWifi, setCopiedWifi] = useState(false);

  // Countdowns
  const [checkInLeft, setCheckInLeft] = useState(() => computeTimeLeft(GITE_INFO.checkIn));
  const [nyLeft, setNyLeft] = useState(() => computeTimeLeft(GITE_INFO.newYearTarget));

  // Real-time Firestore state
  const [members, setMembers] = useState([]);
  const [links, setLinks] = useState({
    whatsappUrl: "",
    googlePhotosUrl: GITE_INFO.googlePhotosUrl,
    googlePhotos2026Url: GITE_INFO.googlePhotos2026Url,
    tricountUrl: GITE_INFO.tricountUrl,
    playlistUrl: ""
  });
  const [families, setFamilies] = useState(INITIAL_FAMILIES);
  const [rooms, setRooms] = useState(INITIAL_ROOMS);
  const [meals, setMeals] = useState(INITIAL_MEALS);
  const [groceries, setGroceries] = useState(INITIAL_GROCERIES);
  const [activities, setActivities] = useState(INITIAL_ACTIVITIES);
  const [photoHighlights, setPhotoHighlights] = useState([]);
  const [cateringPollVotes, setCateringPollVotes] = useState({
    chef: ["Ludivine", "Baptiste"],
    traiteur: ["Maud"],
    "babysitter-resto": ["Maud"]
  });

  // Local interactive states
  const [checkedPacking, setCheckedPacking] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("na2027_packing") || "{}");
    } catch {
      return {};
    }
  });

  // Forms & Modals
  const linksDialogRef = useRef(null);
  const mealDialogRef = useRef(null);
  const familyDialogRef = useRef(null);

  const [linksDraft, setLinksDraft] = useState({
    whatsappUrl: "",
    googlePhotosUrl: GITE_INFO.googlePhotosUrl,
    tricountUrl: GITE_INFO.tricountUrl,
    playlistUrl: ""
  });

  const [editingMeal, setEditingMeal] = useState(null);
  const [editingFamily, setEditingFamily] = useState(null);
  const [newChildByFam, setNewChildByFam] = useState({});

  // New family form
  const [newFamAdult1, setNewFamAdult1] = useState("");
  const [newFamAdult2, setNewFamAdult2] = useState("");
  const [newFamOrigin, setNewFamOrigin] = useState("");
  const [newFamKidsText, setNewFamKidsText] = useState("");

  const [newGroceryLabel, setNewGroceryLabel] = useState("");
  const [newGroceryCategory, setNewGroceryCategory] = useState("Spécialités Régionales");
  const [newGroceryWho, setNewGroceryWho] = useState("");
  const [groceryFilter, setGroceryFilter] = useState("Toutes");

  // Activities states & filters
  const [actCategoryFilter, setActCategoryFilter] = useState("Toutes");
  const [newActTitle, setNewActTitle] = useState("");
  const [newActCat, setNewActCat] = useState("Sport & Aventure");
  const [newActDay, setNewActDay] = useState("En semaine");
  const [newActDesc, setNewActDesc] = useState("");
  const [newActImg, setNewActImg] = useState("");

  const [newOccupantByRoom, setNewOccupantByRoom] = useState({});
  const [myArrivalTime, setMyArrivalTime] = useState("");
  const [myTransport, setMyTransport] = useState("");
  const [arrivalSaved, setArrivalSaved] = useState(false);

  const [newPhotoTitle, setNewPhotoTitle] = useState("");
  const [newPhotoUrl, setNewPhotoUrl] = useState("");

  // Countdown ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCheckInLeft(computeTimeLeft(GITE_INFO.checkIn));
      setNyLeft(computeTimeLeft(GITE_INFO.newYearTarget));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Native <dialog closedby="any"> fallback for browsers without declarative closedBy support
  useEffect(() => {
    const dialogs = [linksDialogRef.current, mealDialogRef.current, familyDialogRef.current].filter(Boolean);
    if ("closedBy" in HTMLDialogElement.prototype) return;

    const handleBackdropClick = (event) => {
      const dialog = event.currentTarget;
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isDialogContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!isDialogContent) {
        dialog.close();
      }
    };

    dialogs.forEach((d) => d.addEventListener("click", handleBackdropClick));
    return () => {
      dialogs.forEach((d) => d.removeEventListener("click", handleBackdropClick));
    };
  }, [user]);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Firestore real-time subscriptions + automatic initial seed/upgrade
  useEffect(() => {
    if (!user) return;

    // 1. Settings / Links (auto-populate Google Photos 2027, 2026 & Tricount if missing)
    const unsubSettings = onSnapshot(
      doc(db, "settings", "global"),
      async (snap) => {
        if (!snap.exists()) {
          await setDoc(
            doc(db, "settings", "global"),
            {
              whatsappUrl: "",
              googlePhotosUrl: GITE_INFO.googlePhotosUrl,
              tricountUrl: GITE_INFO.tricountUrl,
              playlistUrl: "",
              updatedBy: "Baptiste",
              updatedAt: Date.now()
            },
            { merge: true }
          ).catch(() => {});
        } else {
          const data = snap.data();
          const nextGooglePhotos = data.googlePhotosUrl || GITE_INFO.googlePhotosUrl;
          const nextTricount = data.tricountUrl || GITE_INFO.tricountUrl;
          setLinks({
            whatsappUrl: data.whatsappUrl || "",
            googlePhotosUrl: nextGooglePhotos,
            googlePhotos2026Url: GITE_INFO.googlePhotos2026Url,
            tricountUrl: nextTricount,
            playlistUrl: data.playlistUrl || ""
          });
          if (!data.googlePhotosUrl || !data.tricountUrl) {
            await setDoc(
              doc(db, "settings", "global"),
              {
                googlePhotosUrl: nextGooglePhotos,
                tricountUrl: nextTricount,
                updatedAt: Date.now()
              },
              { merge: true }
            ).catch(() => {});
          }
        }
      },
      (err) => console.warn("Settings listener warning:", err.message)
    );

    // 2. Users / Members
    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMembers(list);
        const me = list.find((m) => m.id === user.uid);
        if (me) {
          setMyArrivalTime((prev) => prev || me.arrivalTime || "");
          setMyTransport((prev) => prev || me.transport || "");
        }
      },
      (err) => console.warn("Users listener warning:", err.message)
    );

    // 3. Families (Couples + Children)
    const unsubFamilies = onSnapshot(
      collection(db, "families"),
      async (snap) => {
        if (snap.empty) {
          for (const fam of INITIAL_FAMILIES) {
            await setDoc(doc(db, "families", fam.id), {
              name: fam.coupleName,
              city: fam.origin,
              adults: fam.adults,
              kids: fam.children,
              adultRoomId: fam.adultRoomId || "",
              kidsRoomId: fam.kidsRoomId || "",
              depositPaid: !!fam.depositPaid,
              updatedAt: Date.now()
            }).catch(() => {});
          }
        } else {
          const loaded = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              coupleName: data.name || data.coupleName || "Couple",
              origin: data.city || data.origin || "",
              adults: Array.isArray(data.adults) ? data.adults : [],
              children: Array.isArray(data.kids)
                ? data.kids
                : Array.isArray(data.children)
                ? data.children
                : [],
              adultRoomId: data.adultRoomId || "",
              kidsRoomId: data.kidsRoomId || "",
              depositPaid: !!data.depositPaid
            };
          });
          loaded.sort((a, b) => a.id.localeCompare(b.id));
          setFamilies(loaded);
        }
      },
      (err) => console.warn("Families listener warning:", err.message)
    );

    // 4. Rooms (ensure all 10 rooms exist)
    const unsubRooms = onSnapshot(
      collection(db, "rooms"),
      async (snap) => {
        const existingIds = new Set(snap.docs.map((d) => d.id));
        const missingRooms = INITIAL_ROOMS.filter((r) => !existingIds.has(r.id));
        if (missingRooms.length > 0) {
          for (const r of missingRooms) {
            await setDoc(doc(db, "rooms", r.id), {
              name: r.name,
              type: r.type,
              capacity: r.capacity,
              capacityLabel: r.capacityLabel,
              floor: r.floor,
              description: r.description,
              photoUrl: r.photoUrl,
              occupants: r.occupants,
              notes: r.notes || "",
              updatedAt: Date.now()
            }).catch(() => {});
          }
        }
        if (!snap.empty) {
          const loaded = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          loaded.sort((a, b) => a.id.localeCompare(b.id));
          setRooms(loaded);
        }
      },
      (err) => console.warn("Rooms listener warning:", err.message)
    );

    // 5. Meals
    const unsubMeals = onSnapshot(
      collection(db, "meals"),
      async (snap) => {
        if (snap.empty) {
          for (const m of INITIAL_MEALS) {
            await setDoc(doc(db, "meals", m.id), {
              day: m.day,
              slot: m.slot,
              menu: m.menu,
              cooks: m.cooks,
              notes: m.notes || "",
              updatedAt: Date.now()
            }).catch(() => {});
          }
        } else {
          const loaded = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          loaded.sort((a, b) => a.id.localeCompare(b.id));
          setMeals(loaded);
        }
      },
      (err) => console.warn("Meals listener warning:", err.message)
    );

    // 6. Groceries
    const unsubGroceries = onSnapshot(
      collection(db, "groceries"),
      async (snap) => {
        if (snap.empty) {
          for (const g of INITIAL_GROCERIES) {
            await setDoc(doc(db, "groceries", g.id), {
              label: g.label,
              category: g.category,
              broughtBy: g.broughtBy,
              checked: g.checked,
              createdBy: "Baptiste",
              createdAt: Date.now()
            }).catch(() => {});
          }
        } else {
          const loaded = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          loaded.sort((a, b) => (a.checked === b.checked ? 0 : a.checked ? 1 : -1));
          setGroceries(loaded);
        }
      },
      (err) => console.warn("Groceries listener warning:", err.message)
    );

    // 7. Activities (Auto-seed the 22 illustrated activities & remove legacy unillustrated act-1..act-6)
    const unsubActivities = onSnapshot(
      collection(db, "activities"),
      async (snap) => {
        const existingIds = new Set(snap.docs.map((d) => d.id));
        const missingNewActs = INITIAL_ACTIVITIES.filter((a) => !existingIds.has(a.id));
        if (missingNewActs.length > 0) {
          for (const a of missingNewActs) {
            await setDoc(doc(db, "activities", a.id), {
              title: a.title,
              category: a.category,
              day: a.day,
              duration: a.duration,
              description: a.description,
              imageUrl: a.imageUrl,
              proposedBy: a.proposedBy,
              votes: a.votesHot || [],
              votesHot: a.votesHot || [],
              votesCold: a.votesCold || [],
              createdAt: Date.now()
            }).catch(() => {});
          }
          // Clean up legacy v1 activities (act-1..act-6) that had no background image
          for (const legacyId of ["act-1", "act-2", "act-3", "act-4", "act-5", "act-6"]) {
            if (existingIds.has(legacyId)) {
              await deleteDoc(doc(db, "activities", legacyId)).catch(() => {});
            }
          }
        }
        if (!snap.empty) {
          const loaded = snap.docs
            .filter((d) => !["act-1", "act-2", "act-3", "act-4", "act-5", "act-6"].includes(d.id))
            .map((d) => {
              const data = d.data();
              const votesHot = Array.isArray(data.votesHot)
                ? data.votesHot
                : Array.isArray(data.votes)
                ? data.votes
                : [];
              const votesCold = Array.isArray(data.votesCold) ? data.votesCold : [];
              return {
                id: d.id,
                ...data,
                votesHot,
                votesCold
              };
            });
          loaded.sort((a, b) => {
            const diffHot = (b.votesHot?.length || 0) - (a.votesHot?.length || 0);
            if (diffHot !== 0) return diffHot;
            return a.id.localeCompare(b.id);
          });
          if (loaded.length > 0) {
            setActivities(loaded);
          }
        }
      },
      (err) => console.warn("Activities listener warning:", err.message)
    );

    // 8. WhatsApp Catering Poll
    const unsubPolls = onSnapshot(
      doc(db, "polls", "catering-special-night"),
      async (snap) => {
        if (!snap.exists()) {
          await setDoc(doc(db, "polls", "catering-special-night"), {
            title: "Soirée spéciale sans cuisiner (Discussion WhatsApp)",
            options: {
              chef: ["Ludivine", "Baptiste"],
              traiteur: ["Maud"],
              "babysitter-resto": ["Maud"]
            },
            updatedAt: Date.now()
          }).catch(() => {});
        } else {
          const data = snap.data();
          if (data.options) {
            setCateringPollVotes(data.options);
          }
        }
      },
      (err) => console.warn("Polls listener warning:", err.message)
    );

    // 9. Photo highlights
    const unsubPhotos = onSnapshot(
      collection(db, "photos_highlights"),
      (snap) => {
        const loaded = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        loaded.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setPhotoHighlights(loaded);
      },
      (err) => console.warn("Photos listener warning:", err.message)
    );

    return () => {
      unsubSettings();
      unsubUsers();
      unsubFamilies();
      unsubRooms();
      unsubMeals();
      unsubGroceries();
      unsubActivities();
      unsubPolls();
      unsubPhotos();
    };
  }, [user]);

  const userDisplayName =
    user?.displayName ||
    members.find((m) => m.id === user?.uid)?.firstName ||
    user?.email?.split("@")[0] ||
    "Pote";

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthBusy(true);
    try {
      if (isRegistering) {
        const cleanName = firstName.trim();
        if (!cleanName) {
          setAuthError("Indique ton prénom pour que les potes te reconnaissent !");
          setAuthBusy(false);
          return;
        }
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: cleanName });
        await setDoc(doc(db, "users", cred.user.uid), {
          uid: cred.user.uid,
          firstName: cleanName,
          email: email.trim(),
          familyGroup: originCity,
          arrivalTime: "Sam. 26 déc. vers 16h30",
          transport: "Voiture",
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } else {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        if (firstName.trim() && !cred.user.displayName) {
          await updateProfile(cred.user, { displayName: firstName.trim() });
        }
      }
    } catch (err) {
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        setAuthError("Email ou mot de passe incorrect. Si c'est ta première visite, clique sur « Première visite ».");
      } else if (err.code === "auth/email-already-in-use") {
        setAuthError("Cet email a déjà un compte ! Bascule sur « Se connecter ».");
      } else if (err.code === "auth/weak-password") {
        setAuthError("Choisis un mot de passe d'au moins 6 caractères.");
      } else {
        setAuthError(err.message);
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const copyWifiCode = () => {
    navigator.clipboard.writeText(GITE_INFO.wifi.code);
    setCopiedWifi(true);
    setTimeout(() => setCopiedWifi(false), 2500);
  };

  const togglePackingItem = (id) => {
    const next = { ...checkedPacking, [id]: !checkedPacking[id] };
    setCheckedPacking(next);
    localStorage.setItem("na2027_packing", JSON.stringify(next));
  };

  // Save shared links
  const openLinksModal = () => {
    setLinksDraft({
      whatsappUrl: links.whatsappUrl || "",
      googlePhotosUrl: links.googlePhotosUrl || GITE_INFO.googlePhotosUrl,
      tricountUrl: links.tricountUrl || GITE_INFO.tricountUrl,
      playlistUrl: links.playlistUrl || ""
    });
    linksDialogRef.current?.showModal();
  };

  const saveSharedLinks = async (e) => {
    e.preventDefault();
    await setDoc(
      doc(db, "settings", "global"),
      {
        whatsappUrl: linksDraft.whatsappUrl.trim(),
        googlePhotosUrl: linksDraft.googlePhotosUrl.trim() || GITE_INFO.googlePhotosUrl,
        tricountUrl: linksDraft.tricountUrl.trim() || GITE_INFO.tricountUrl,
        playlistUrl: linksDraft.playlistUrl.trim(),
        updatedBy: userDisplayName,
        updatedAt: Date.now()
      },
      { merge: true }
    );
    linksDialogRef.current?.close();
  };

  // Toggle vote on WhatsApp Catering Poll
  const toggleCateringOptionVote = async (optionId) => {
    const currentList = Array.isArray(cateringPollVotes[optionId]) ? cateringPollVotes[optionId] : [];
    const hasVoted = currentList.includes(userDisplayName);
    const nextList = hasVoted
      ? currentList.filter((n) => n !== userDisplayName)
      : [...currentList, userDisplayName];
    const nextOptions = {
      ...cateringPollVotes,
      [optionId]: nextList
    };
    setCateringPollVotes(nextOptions);
    await setDoc(
      doc(db, "polls", "catering-special-night"),
      {
        title: "Soirée spéciale sans cuisiner (Discussion WhatsApp)",
        options: nextOptions,
        updatedAt: Date.now()
      },
      { merge: true }
    );
  };

  // Arrival update
  const saveMyArrival = async (e) => {
    e.preventDefault();
    if (!user) return;
    await setDoc(
      doc(db, "users", user.uid),
      {
        uid: user.uid,
        firstName: userDisplayName,
        email: user.email || "",
        arrivalTime: myArrivalTime.trim() || "Sam. 26 déc. 16h",
        transport: myTransport.trim() || "Voiture",
        updatedAt: Date.now()
      },
      { merge: true }
    );
    setArrivalSaved(true);
    setTimeout(() => setArrivalSaved(false), 2500);
  };

  // ==================== FAMILIES & BEDROOM ASSIGNMENT ACTIONS ====================
  const assignFamilyAdultsToRoom = async (fam, targetRoomId) => {
    const prevRoomId = fam.adultRoomId;
    const adultNames = Array.isArray(fam.adults) ? fam.adults.filter(Boolean) : [];

    // Update family doc
    await setDoc(
      doc(db, "families", fam.id),
      {
        name: fam.coupleName,
        city: fam.origin || "",
        adults: fam.adults,
        kids: fam.children,
        adultRoomId: targetRoomId,
        kidsRoomId: fam.kidsRoomId || "",
        depositPaid: !!fam.depositPaid,
        updatedAt: Date.now()
      },
      { merge: true }
    );

    // Remove adult names from previous room if different
    if (prevRoomId && prevRoomId !== targetRoomId) {
      const oldRoom = rooms.find((r) => r.id === prevRoomId);
      if (oldRoom) {
        const filtered = (oldRoom.occupants || []).filter((occ) => !adultNames.includes(occ));
        await updateDoc(doc(db, "rooms", oldRoom.id), { occupants: filtered, updatedAt: Date.now() }).catch(() => {});
      }
    }

    // Add adult names to target room
    if (targetRoomId) {
      const newRoom = rooms.find((r) => r.id === targetRoomId);
      if (newRoom) {
        const existing = Array.isArray(newRoom.occupants) ? newRoom.occupants : [];
        const merged = Array.from(new Set([...existing, ...adultNames]));
        await updateDoc(doc(db, "rooms", newRoom.id), { occupants: merged, updatedAt: Date.now() }).catch(() => {});
      }
    }
  };

  const assignFamilyKidsToRoom = async (fam, targetRoomId) => {
    const prevRoomId = fam.kidsRoomId;
    const kidLabels = (Array.isArray(fam.children) ? fam.children : []).map((c) =>
      c.age ? `${c.name} (${c.age})` : c.name
    );
    const kidRawNames = (Array.isArray(fam.children) ? fam.children : []).map((c) => c.name);

    await setDoc(
      doc(db, "families", fam.id),
      {
        name: fam.coupleName,
        city: fam.origin || "",
        adults: fam.adults,
        kids: fam.children,
        adultRoomId: fam.adultRoomId || "",
        kidsRoomId: targetRoomId,
        depositPaid: !!fam.depositPaid,
        updatedAt: Date.now()
      },
      { merge: true }
    );

    if (prevRoomId && prevRoomId !== targetRoomId) {
      const oldRoom = rooms.find((r) => r.id === prevRoomId);
      if (oldRoom) {
        const filtered = (oldRoom.occupants || []).filter(
          (occ) => !kidLabels.includes(occ) && !kidRawNames.some((n) => occ.startsWith(n))
        );
        await updateDoc(doc(db, "rooms", oldRoom.id), { occupants: filtered, updatedAt: Date.now() }).catch(() => {});
      }
    }

    if (targetRoomId) {
      const newRoom = rooms.find((r) => r.id === targetRoomId);
      if (newRoom) {
        const existing = Array.isArray(newRoom.occupants) ? newRoom.occupants : [];
        const merged = Array.from(new Set([...existing, ...kidLabels]));
        await updateDoc(doc(db, "rooms", newRoom.id), { occupants: merged, updatedAt: Date.now() }).catch(() => {});
      }
    }
  };

  const addChildToFamily = async (fam) => {
    const draft = newChildByFam[fam.id] || {};
    const name = (draft.name || "").trim();
    const age = (draft.age || "").trim();
    if (!name) return;

    const nextChildren = [...(fam.children || []), { name, age: age || "Enfant" }];
    await setDoc(
      doc(db, "families", fam.id),
      {
        name: fam.coupleName,
        city: fam.origin || "",
        adults: fam.adults,
        kids: nextChildren,
        adultRoomId: fam.adultRoomId || "",
        kidsRoomId: fam.kidsRoomId || "",
        depositPaid: !!fam.depositPaid,
        updatedAt: Date.now()
      },
      { merge: true }
    );

    if (fam.kidsRoomId) {
      const kidRoom = rooms.find((r) => r.id === fam.kidsRoomId);
      if (kidRoom) {
        const label = age ? `${name} (${age})` : name;
        const merged = Array.from(new Set([...(kidRoom.occupants || []), label]));
        await updateDoc(doc(db, "rooms", kidRoom.id), { occupants: merged, updatedAt: Date.now() }).catch(() => {});
      }
    }
    setNewChildByFam((prev) => ({ ...prev, [fam.id]: { name: "", age: "" } }));
  };

  const removeChildFromFamily = async (fam, childIndex) => {
    const removed = (fam.children || [])[childIndex];
    const nextChildren = (fam.children || []).filter((_, i) => i !== childIndex);
    await setDoc(
      doc(db, "families", fam.id),
      {
        name: fam.coupleName,
        city: fam.origin || "",
        adults: fam.adults,
        kids: nextChildren,
        adultRoomId: fam.adultRoomId || "",
        kidsRoomId: fam.kidsRoomId || "",
        depositPaid: !!fam.depositPaid,
        updatedAt: Date.now()
      },
      { merge: true }
    );

    if (removed && fam.kidsRoomId) {
      const kidRoom = rooms.find((r) => r.id === fam.kidsRoomId);
      if (kidRoom) {
        const filtered = (kidRoom.occupants || []).filter((occ) => !occ.startsWith(removed.name));
        await updateDoc(doc(db, "rooms", kidRoom.id), { occupants: filtered, updatedAt: Date.now() }).catch(() => {});
      }
    }
  };

  const toggleFamilyDeposit = async (fam) => {
    await setDoc(
      doc(db, "families", fam.id),
      {
        name: fam.coupleName,
        city: fam.origin || "",
        adults: fam.adults,
        kids: fam.children,
        adultRoomId: fam.adultRoomId || "",
        kidsRoomId: fam.kidsRoomId || "",
        depositPaid: !fam.depositPaid,
        updatedAt: Date.now()
      },
      { merge: true }
    );
  };

  const openFamilyEditor = (fam) => {
    setEditingFamily({
      ...fam,
      adult1: fam.adults?.[0] || "",
      adult2: fam.adults?.[1] || ""
    });
    familyDialogRef.current?.showModal();
  };

  const applyPresetToEditingFamily = (preset) => {
    if (!editingFamily) return;
    setEditingFamily({
      ...editingFamily,
      coupleName: preset.coupleName,
      adult1: preset.adults[0] || "",
      adult2: preset.adults[1] || "",
      origin: preset.origin,
      children: preset.children
    });
  };

  const saveFamilyChanges = async (e) => {
    e.preventDefault();
    if (!editingFamily) return;
    const adults = [editingFamily.adult1.trim(), editingFamily.adult2.trim()].filter(Boolean);
    const coupleName =
      editingFamily.coupleName.trim() ||
      (adults.length === 2 ? `${adults[0]} & ${adults[1]}` : adults[0] || "Famille");
    await setDoc(
      doc(db, "families", editingFamily.id),
      {
        name: coupleName,
        city: (editingFamily.origin || "").trim(),
        adults,
        kids: editingFamily.children || [],
        adultRoomId: editingFamily.adultRoomId || "",
        kidsRoomId: editingFamily.kidsRoomId || "",
        depositPaid: !!editingFamily.depositPaid,
        updatedAt: Date.now()
      },
      { merge: true }
    );
    familyDialogRef.current?.close();
  };

  const handleCreateNewFamily = async (e) => {
    e.preventDefault();
    const a1 = newFamAdult1.trim();
    const a2 = newFamAdult2.trim();
    if (!a1) return;
    const adults = [a1, a2].filter(Boolean);
    const coupleName = adults.length === 2 ? `${a1} & ${a2}` : a1;
    const parsedKids = newFamKidsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((k) => ({ name: k, age: "" }));

    const newId = `fam-${Date.now()}`;
    await setDoc(doc(db, "families", newId), {
      name: coupleName,
      city: newFamOrigin.trim() || "Team Potes",
      adults,
      kids: parsedKids,
      adultRoomId: "",
      kidsRoomId: "",
      depositPaid: false,
      updatedAt: Date.now()
    });
    setNewFamAdult1("");
    setNewFamAdult2("");
    setNewFamOrigin("");
    setNewFamKidsText("");
  };

  const deleteFamily = async (famId) => {
    await deleteDoc(doc(db, "families", famId));
  };

  // Room manual actions
  const addOccupantToRoom = async (room, nameToAdd) => {
    const clean = (nameToAdd || "").trim();
    if (!clean) return;
    const current = Array.isArray(room.occupants) ? room.occupants : [];
    if (current.includes(clean)) return;
    await updateDoc(doc(db, "rooms", room.id), {
      occupants: [...current, clean],
      updatedAt: Date.now()
    });
    setNewOccupantByRoom((prev) => ({ ...prev, [room.id]: "" }));
  };

  const removeOccupantFromRoom = async (room, nameToRemove) => {
    const current = Array.isArray(room.occupants) ? room.occupants : [];
    await updateDoc(doc(db, "rooms", room.id), {
      occupants: current.filter((o) => o !== nameToRemove),
      updatedAt: Date.now()
    });
  };

  // Meal actions
  const openMealEditor = (meal) => {
    setEditingMeal({ ...meal });
    mealDialogRef.current?.showModal();
  };

  const saveMealChanges = async (e) => {
    e.preventDefault();
    if (!editingMeal) return;
    await setDoc(
      doc(db, "meals", editingMeal.id),
      {
        day: editingMeal.day,
        slot: editingMeal.slot,
        menu: editingMeal.menu.trim(),
        cooks: editingMeal.cooks.trim(),
        notes: (editingMeal.notes || "").trim(),
        updatedAt: Date.now()
      },
      { merge: true }
    );
    mealDialogRef.current?.close();
  };

  const joinMealBrigade = async (meal) => {
    const currentCooks = meal.cooks || "";
    if (currentCooks.toLowerCase().includes(userDisplayName.toLowerCase())) return;
    const nextCooks =
      !currentCooks || currentCooks === "À définir"
        ? userDisplayName
        : `${currentCooks}, ${userDisplayName}`;
    await updateDoc(doc(db, "meals", meal.id), {
      cooks: nextCooks,
      updatedAt: Date.now()
    });
  };

  // Groceries actions
  const handleAddGrocery = async (e) => {
    e.preventDefault();
    const label = newGroceryLabel.trim();
    if (!label) return;
    await addDoc(collection(db, "groceries"), {
      label,
      category: newGroceryCategory,
      broughtBy: newGroceryWho.trim() || userDisplayName,
      checked: false,
      createdBy: userDisplayName,
      createdAt: Date.now()
    });
    setNewGroceryLabel("");
    setNewGroceryWho("");
  };

  const toggleGroceryChecked = async (item) => {
    await updateDoc(doc(db, "groceries", item.id), {
      checked: !item.checked
    });
  };

  const deleteGroceryItem = async (id) => {
    await deleteDoc(doc(db, "groceries", id));
  };

  // ==================== ACTIVITIES (CHAUD 🔥 / PAS CHAUD ❄️) ====================
  const handleAddActivity = async (e) => {
    e.preventDefault();
    const title = newActTitle.trim();
    if (!title) return;
    const fallbackImg = DEFAULT_CATEGORY_IMAGES[newActCat] || DEFAULT_CATEGORY_IMAGES["Sport & Aventure"];
    await addDoc(collection(db, "activities"), {
      title,
      category: newActCat,
      day: newActDay.trim() || "À caler",
      duration: "Libre",
      description: newActDesc.trim() || "Proposé pour le groupe !",
      imageUrl: newActImg.trim() || fallbackImg,
      proposedBy: userDisplayName,
      votes: [userDisplayName],
      votesHot: [userDisplayName],
      votesCold: [],
      createdAt: Date.now()
    });
    setNewActTitle("");
    setNewActDesc("");
    setNewActImg("");
  };

  const voteActivityHot = async (act) => {
    const hot = Array.isArray(act.votesHot) ? act.votesHot : [];
    const cold = Array.isArray(act.votesCold) ? act.votesCold : [];
    const isAlreadyHot = hot.includes(userDisplayName);
    const nextHot = isAlreadyHot ? hot.filter((n) => n !== userDisplayName) : [...hot, userDisplayName];
    const nextCold = cold.filter((n) => n !== userDisplayName);
    await updateDoc(doc(db, "activities", act.id), {
      votes: nextHot,
      votesHot: nextHot,
      votesCold: nextCold
    });
  };

  const voteActivityCold = async (act) => {
    const hot = Array.isArray(act.votesHot) ? act.votesHot : [];
    const cold = Array.isArray(act.votesCold) ? act.votesCold : [];
    const isAlreadyCold = cold.includes(userDisplayName);
    const nextCold = isAlreadyCold ? cold.filter((n) => n !== userDisplayName) : [...cold, userDisplayName];
    const nextHot = hot.filter((n) => n !== userDisplayName);
    await updateDoc(doc(db, "activities", act.id), {
      votes: nextHot,
      votesHot: nextHot,
      votesCold: nextCold
    });
  };

  const syncAll22Activities = async () => {
    for (const a of INITIAL_ACTIVITIES) {
      await setDoc(
        doc(db, "activities", a.id),
        {
          title: a.title,
          category: a.category,
          day: a.day,
          duration: a.duration,
          description: a.description,
          imageUrl: a.imageUrl,
          proposedBy: a.proposedBy
        },
        { merge: true }
      ).catch(() => {});
    }
  };

  // Photo highlight actions
  const handleAddPhotoHighlight = async (e) => {
    e.preventDefault();
    if (!newPhotoTitle.trim() || !newPhotoUrl.trim()) return;
    await addDoc(collection(db, "photos_highlights"), {
      title: newPhotoTitle.trim(),
      url: newPhotoUrl.trim(),
      addedBy: userDisplayName,
      createdAt: Date.now()
    });
    setNewPhotoTitle("");
    setNewPhotoUrl("");
  };

  if (authLoading) {
    return (
      <div className="auth-wrapper">
        <div style={{ textAlign: "center" }}>
          <Sparkles size={38} color="#f59e0b" style={{ marginBottom: "0.75rem" }} />
          <h2 className="font-display">Chargement du Château des Cœurs…</h2>
        </div>
      </div>
    );
  }

  // AUTH SCREEN (Prénom + Email + Mot de passe)
  if (!user) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div style={{ position: "relative", height: "185px" }}>
            <img
              src={GITE_INFO.heroPhotos[0].url}
              alt="Château des Cœurs Maleville"
              style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.65)" }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to top, #1e293b 5%, transparent 90%)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                padding: "1.25rem"
              }}
            >
              <span className="badge badge-gold" style={{ alignSelf: "flex-start", marginBottom: "0.4rem" }}>
                ✨ 26 Déc. 2026 → 2 Janv. 2027
              </span>
              <h1 style={{ fontSize: "1.55rem", fontWeight: 800 }}>Nouvel An 2027 entre Potes</h1>
              <p style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>
                Château des Cœurs • Maleville (Aveyron)
              </p>
            </div>
          </div>

          <div style={{ padding: "1.5rem" }}>
            {/* Mini Countdown on Login Screen */}
            <div
              style={{
                background: "rgba(15, 23, 42, 0.65)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "12px",
                padding: "0.85rem",
                marginBottom: "1.25rem",
                textAlign: "center"
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "#fbbf24", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.35rem" }}>
                ⏳ Départ pour le gîte dans
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: "0.6rem" }}>
                <div>
                  <span style={{ fontWeight: 800, fontSize: "1.2rem" }}>{checkInLeft.days}</span>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}> j</span>
                </div>
                <div>
                  <span style={{ fontWeight: 800, fontSize: "1.2rem" }}>{checkInLeft.hours}</span>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}> h</span>
                </div>
                <div>
                  <span style={{ fontWeight: 800, fontSize: "1.2rem" }}>{checkInLeft.minutes}</span>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}> min</span>
                </div>
                <div>
                  <span style={{ fontWeight: 800, fontSize: "1.2rem" }}>{checkInLeft.seconds}</span>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}> s</span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.2rem" }}>
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(false);
                  setAuthError("");
                }}
                className={`btn ${!isRegistering ? "btn-primary" : "btn-secondary"}`}
                style={{ flex: 1 }}
              >
                Se connecter
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(true);
                  setAuthError("");
                }}
                className={`btn ${isRegistering ? "btn-primary" : "btn-secondary"}`}
                style={{ flex: 1 }}
              >
                Première visite
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", color: "#cbd5e1", marginBottom: "0.3rem" }}>
                  Ton Prénom (ou Duo) *
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: Baptiste, Ludivine, Rémi, Maud..."
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required={isRegistering}
                />
              </div>

              {isRegistering && (
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", color: "#cbd5e1", marginBottom: "0.3rem" }}>
                    Ta Team / Région de départ
                  </label>
                  <select
                    className="select"
                    value={originCity}
                    onChange={(e) => setOriginCity(e.target.value)}
                  >
                    <option value="Lyon">Team Lyon (Baptiste & Lulu)</option>
                    <option value="Dijon">Team Dijon (Rémi & M-C)</option>
                    <option value="Sp3C / Est">Team Sp3C / Est (Matthieu & Maud)</option>
                    <option value="Nancy / Metz">Team Nancy / Metz (Antoine & Rachel)</option>
                    <option value="Nice">Team Nice</option>
                    <option value="Paris">Team Paris</option>
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", color: "#cbd5e1", marginBottom: "0.3rem" }}>
                  Adresse Email *
                </label>
                <input
                  type="email"
                  className="input"
                  placeholder="ton.email@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", color: "#cbd5e1", marginBottom: "0.3rem" }}>
                  Mot de passe *
                </label>
                <input
                  type="password"
                  className="input"
                  placeholder="Minimum 6 caractères"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {authError && (
                <div
                  style={{
                    background: "rgba(244, 63, 94, 0.15)",
                    border: "1px solid rgba(244, 63, 94, 0.35)",
                    color: "#fda4af",
                    padding: "0.65rem 0.85rem",
                    borderRadius: "10px",
                    fontSize: "0.83rem"
                  }}
                >
                  {authError}
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={authBusy} style={{ padding: "0.8rem", marginTop: "0.25rem" }}>
                {authBusy
                  ? "Connexion en cours..."
                  : isRegistering
                  ? "Rejoindre le Nouvel An 2027 🎉"
                  : "Entrer dans l'appli 🚀"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const currentHero = GITE_INFO.heroPhotos[heroIndex % GITE_INFO.heroPhotos.length];
  const filteredGroceries =
    groceryFilter === "Toutes"
      ? groceries
      : groceries.filter((g) => g.category === groceryFilter);

  const filteredActivities =
    actCategoryFilter === "Toutes"
      ? activities
      : activities.filter((a) => a.category === actCategoryFilter);

  const totalAdultsCount = families.reduce((acc, f) => acc + (f.adults?.length || 0), 0);
  const totalKidsCount = families.reduce((acc, f) => acc + (f.children?.length || 0), 0);

  return (
    <div className="app-container">
      {/* TOP BAR */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-badge">27</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1.05rem", lineHeight: 1.15 }} className="font-display">
              Nouvel An 2027 • Maleville
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Château des Cœurs • 26 Déc. – 2 Janv.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div className="user-pill">
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
            <strong>{userDisplayName}</strong>
          </div>
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="btn btn-secondary"
            title="Se déconnecter"
            style={{ padding: "0.5rem 0.7rem" }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* HERO BANNER + DUAL COUNTDOWN */}
      <section className="hero-card">
        <div className="hero-bg">
          <img src={currentHero.url} alt={currentHero.caption} />
          <div className="hero-overlay">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", marginBottom: "0.45rem" }}>
                  <span className="badge badge-gold">🏰 {GITE_INFO.rating}</span>
                  <span className="badge badge-emerald">
                    👨‍👩‍👧‍👦 {totalAdultsCount} adultes & {totalKidsCount} enfants
                  </span>
                  <span className="badge badge-sky">🏊 Piscine 26°C • Hammam • Sauna • Cinéma</span>
                </div>
                <h1 style={{ fontSize: "clamp(1.35rem, 3vw, 2rem)", fontWeight: 800 }}>
                  {GITE_INFO.name}
                </h1>
                <p style={{ fontSize: "0.88rem", color: "#e2e8f0" }}>
                  📍 {GITE_INFO.address} — <em>{currentHero.caption}</em>
                </p>
              </div>

              <div style={{ display: "flex", gap: "0.4rem" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: "0.45rem 0.65rem", background: "rgba(15,23,42,0.75)" }}
                  onClick={() =>
                    setHeroIndex((i) => (i - 1 + GITE_INFO.heroPhotos.length) % GITE_INFO.heroPhotos.length)
                  }
                  aria-label="Photo précédente"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: "0.45rem 0.65rem", background: "rgba(15,23,42,0.75)" }}
                  onClick={() => setHeroIndex((i) => (i + 1) % GITE_INFO.heroPhotos.length)}
                  aria-label="Photo suivante"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* DUAL COUNTDOWN STRIP */}
        <div className="countdown-strip">
          <div className="countdown-box">
            <div className="countdown-label">
              <Car size={15} /> Arrivée au Château (Sam. 26 Déc. 16h)
            </div>
            <div className="countdown-digits">
              <div className="digit-pill">
                <div className="digit-val">{checkInLeft.days}</div>
                <div className="digit-unit">Jours</div>
              </div>
              <div className="digit-pill">
                <div className="digit-val">{checkInLeft.hours}</div>
                <div className="digit-unit">Heures</div>
              </div>
              <div className="digit-pill">
                <div className="digit-val">{checkInLeft.minutes}</div>
                <div className="digit-unit">Min</div>
              </div>
              <div className="digit-pill">
                <div className="digit-val">{checkInLeft.seconds}</div>
                <div className="digit-unit">Sec</div>
              </div>
            </div>
          </div>

          <div className="countdown-box">
            <div className="countdown-label" style={{ color: "#38bdf8" }}>
              <Sparkles size={15} /> Passage en 2027 (31 Déc. Minuit)
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
              <div className="countdown-digits">
                <div className="digit-pill">
                  <div className="digit-val">{nyLeft.days}</div>
                  <div className="digit-unit">Jours</div>
                </div>
                <div className="digit-pill">
                  <div className="digit-val">{nyLeft.hours}</div>
                  <div className="digit-unit">Heures</div>
                </div>
                <div className="digit-pill">
                  <div className="digit-val">{nyLeft.minutes}</div>
                  <div className="digit-unit">Min</div>
                </div>
                <div className="digit-pill">
                  <div className="digit-val">{nyLeft.seconds}</div>
                  <div className="digit-unit">Sec</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } })}
                className="btn btn-secondary"
                style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem" }}
                title="Lancer des confettis"
              >
                🎉
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* NAVIGATION TABS */}
      <nav className="nav-tabs" aria-label="Sections principales">
        <button
          type="button"
          className={`tab-btn ${activeTab === "home" ? "active" : ""}`}
          onClick={() => setActiveTab("home")}
        >
          <Home size={17} /> Accueil & WhatsApp
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "rooms" ? "active" : ""}`}
          onClick={() => setActiveTab("rooms")}
        >
          <BedDouble size={17} /> Familles & Chambres (10)
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "activities" ? "active" : ""}`}
          onClick={() => setActiveTab("activities")}
        >
          <Flame size={17} /> Activités ({activities.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "meals" ? "active" : ""}`}
          onClick={() => setActiveTab("meals")}
        >
          <Utensils size={17} /> Repas & Courses
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "photos" ? "active" : ""}`}
          onClick={() => setActiveTab("photos")}
        >
          <Camera size={17} /> Google Photos (27 & 26)
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "info" ? "active" : ""}`}
          onClick={() => setActiveTab("info")}
        >
          <Info size={17} /> Infos Pratiques
        </button>
      </nav>

      {/* ==================== TAB 1: ACCUEIL, RACCOURCIS & WHATSAPP DIGEST ==================== */}
      {activeTab === "home" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Quick Actions Strip */}
          <div className="card card-gold">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 700 }}>⚡ Raccourcis Officiels du Groupe</h2>
                <p style={{ fontSize: "0.83rem", color: "var(--text-muted)" }}>
                  Albums Google Photos 2027 & 2026, Tricount du groupe, GPS Maleville et Wi-Fi en un clic
                </p>
              </div>
              <button type="button" onClick={openLinksModal} className="btn btn-secondary">
                <Settings size={15} /> Configurer les liens
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(205px, 1fr))", gap: "0.7rem" }}>
              <a
                href={links.googlePhotosUrl || GITE_INFO.googlePhotosUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-photos"
              >
                <Camera size={18} /> Album Photos 2027
              </a>

              <a
                href={GITE_INFO.googlePhotos2026Url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ borderColor: "rgba(56, 189, 248, 0.4)", color: "#7dd3fc" }}
              >
                <Sparkles size={17} /> Souvenirs Nouvel An 2026
              </a>

              <a
                href={links.tricountUrl || GITE_INFO.tricountUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-whatsapp"
              >
                <Wallet size={18} /> Tricount Nouvel An 2027
              </a>

              <a href={GITE_INFO.mapsUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
                <MapPin size={17} color="#f59e0b" /> GPS (Maleville 12350)
              </a>

              <button type="button" onClick={copyWifiCode} className="btn btn-secondary">
                {copiedWifi ? <Check size={17} color="#10b981" /> : <Wifi size={17} color="#38bdf8" />}
                {copiedWifi ? "Code Wi-Fi copié !" : `Wi-Fi : ${GITE_INFO.wifi.code}`}
              </button>
            </div>
          </div>

          {/* WhatsApp Group Discussions Digest & Interactive Poll */}
          <div className="card" style={{ borderColor: "rgba(37, 211, 102, 0.35)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.9rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                <MessageCircle size={22} color="#25D366" />
                <div>
                  <h3 style={{ fontSize: "1.12rem", fontWeight: 800 }}>
                    💬 Récap des discussions du groupe WhatsApp « {GITE_INFO.whatsappDigest.groupName} »
                  </h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Les infos clés extraites de la conversation pour que personne ne perde le fil
                  </p>
                </div>
              </div>
              <a
                href={links.tricountUrl || GITE_INFO.tricountUrl}
                target="_blank"
                rel="noreferrer"
                className="badge badge-emerald"
                style={{ textDecoration: "none", padding: "0.35rem 0.75rem" }}
              >
                Ouvrir le Tricount <ExternalLink size={12} />
              </a>
            </div>

            <div className="grid-2" style={{ alignItems: "start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                {GITE_INFO.whatsappDigest.highlights.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "0.65rem 0.85rem",
                      background: "rgba(15, 23, 42, 0.65)",
                      borderRadius: "10px",
                      border: "1px solid var(--border-subtle)",
                      fontSize: "0.86rem"
                    }}
                  >
                    {item}
                  </div>
                ))}
                <div
                  style={{
                    padding: "0.65rem 0.85rem",
                    background: "rgba(245, 158, 11, 0.1)",
                    borderRadius: "10px",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    fontSize: "0.83rem",
                    color: "#fde68a"
                  }}
                >
                  💳 <strong>Rappel virement acompte (100 € / adulte) :</strong> par virement Fortuneo ou PayPal entre proches à{" "}
                  <strong>baptiste.bachelart@gmail.com</strong> (06 36 36 54 07). Tu peux cocher ton statut dans l'onglet{" "}
                  <button
                    type="button"
                    onClick={() => setActiveTab("rooms")}
                    style={{ background: "none", border: "none", color: "#38bdf8", textDecoration: "underline", cursor: "pointer", fontWeight: 700 }}
                  >
                    Familles & Chambres
                  </button>
                  .
                </div>
              </div>

              {/* Catering / Evening Vote from WhatsApp */}
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.7)",
                  padding: "0.95rem",
                  borderRadius: "12px",
                  border: "1px solid var(--border-gold)"
                }}
              >
                <div style={{ fontWeight: 800, fontSize: "0.95rem", marginBottom: "0.3rem", color: "#fbbf24" }}>
                  {GITE_INFO.whatsappDigest.cateringDebateTitle}
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
                  Lulu & Maud ont lancé le débat sur WhatsApp pour faire un soir sans cuisiner. Clique sur ce qui te tente :
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                  {GITE_INFO.whatsappDigest.cateringOptions.map((opt) => {
                    const voters = Array.isArray(cateringPollVotes[opt.id]) ? cateringPollVotes[opt.id] : [];
                    const iVoted = voters.includes(userDisplayName);
                    return (
                      <div
                        key={opt.id}
                        style={{
                          padding: "0.65rem 0.75rem",
                          borderRadius: "10px",
                          background: iVoted ? "rgba(245, 158, 11, 0.14)" : "rgba(30, 41, 59, 0.7)",
                          border: iVoted ? "1px solid #f59e0b" : "1px solid var(--border-subtle)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "0.6rem"
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: "0.87rem" }}>{opt.label}</div>
                          <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>{opt.desc}</div>
                          {voters.length > 0 && (
                            <div style={{ fontSize: "0.75rem", color: "#34d399", marginTop: "0.2rem" }}>
                              🔥 Chauds ({voters.length}) : {voters.join(", ")}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleCateringOptionVote(opt.id)}
                          className={`btn ${iVoted ? "btn-primary" : "btn-secondary"}`}
                          style={{ padding: "0.4rem 0.7rem", fontSize: "0.78rem", whiteSpace: "nowrap" }}
                        >
                          {iVoted ? "🔥 Chaud !" : "+ Voter"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="grid-2">
            {/* Highlights of the Castle */}
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>🏰 Le Château des Cœurs en bref</h3>
                <a
                  href={GITE_INFO.airbnbUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="badge badge-gold"
                  style={{ textDecoration: "none" }}
                >
                  Voir l'annonce Airbnb <ExternalLink size={12} />
                </a>
              </div>
              <p style={{ fontSize: "0.88rem", color: "#cbd5e1", marginBottom: "0.9rem" }}>
                Demeure du XVIIIe siècle sur 3 étages privatisée pour notre groupe du{" "}
                <strong>samedi 26 déc. (16h)</strong> au <strong>samedi 2 janv. (16h)</strong>.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {GITE_INFO.highlights.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "0.55rem 0.75rem",
                      background: "rgba(15, 23, 42, 0.55)",
                      borderRadius: "10px",
                      fontSize: "0.87rem",
                      border: "1px solid var(--border-subtle)"
                    }}
                  >
                    {h}
                  </div>
                ))}
              </div>
            </div>

            {/* Arrivals & Carpool / Drive */}
            <div className="card">
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.4rem" }}>
                🚗 Arrivées & Covoit' (Sam. 26 Déc.)
              </h3>
              <p style={{ fontSize: "0.83rem", color: "var(--text-muted)", marginBottom: "0.9rem" }}>
                Indique vers quelle heure tu arrives et si tu passes au Drive (Leclerc / Carrefour Villefranche à 10 min) :
              </p>

              <form onSubmit={saveMyArrival} style={{ display: "flex", flexDirection: "column", gap: "0.65rem", marginBottom: "1rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="Heure d'arrivée (ex: Sam. 16h30)"
                    value={myArrivalTime}
                    onChange={(e) => setMyArrivalTime(e.target.value)}
                  />
                  <input
                    type="text"
                    className="input"
                    placeholder="Infos (ex: Voiture Lyon, dispo Drive)"
                    value={myTransport}
                    onChange={(e) => setMyTransport(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
                  {arrivalSaved ? "✅ Enregistré !" : "Mettre à jour mon arrivée"}
                </button>
              </form>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", maxHeight: "220px", overflowY: "auto" }}>
                {members.length === 0 ? (
                  <div style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}>
                    Aucun membre connecté pour l'instant.
                  </div>
                ) : (
                  members.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.55rem 0.75rem",
                        background: "rgba(15, 23, 42, 0.55)",
                        borderRadius: "10px",
                        fontSize: "0.85rem"
                      }}
                    >
                      <div>
                        <strong>{m.firstName}</strong>{" "}
                        {m.familyGroup && (
                          <span className="badge" style={{ marginLeft: "0.3rem" }}>
                            {m.familyGroup}
                          </span>
                        )}
                      </div>
                      <div style={{ color: "#cbd5e1", textAlign: "right", fontSize: "0.8rem" }}>
                        <span>{m.arrivalTime || "Heure à préciser"}</span>
                        {m.transport && <span style={{ color: "#94a3b8" }}> • {m.transport}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Photo Tour of the Gite */}
          <div className="card">
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.85rem" }}>
              ✨ Aperçu des espaces du Château des Cœurs
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "0.85rem" }}>
              {GITE_INFO.heroPhotos.map((p, idx) => (
                <div
                  key={idx}
                  onClick={() => setHeroIndex(idx)}
                  style={{
                    cursor: "pointer",
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: heroIndex === idx ? "2px solid #f59e0b" : "1px solid var(--border-subtle)",
                    background: "#0f172a"
                  }}
                >
                  <img
                    src={p.url}
                    alt={p.caption}
                    loading="lazy"
                    style={{ width: "100%", height: "135px", objectFit: "cover", display: "block" }}
                  />
                  <div style={{ padding: "0.5rem 0.65rem", fontSize: "0.8rem", fontWeight: 600 }}>
                    {p.caption}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: FAMILLES (COUPLES + ENFANTS) & 10 CHAMBRES ==================== */}
      {activeTab === "rooms" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* SECTION 1: LES FAMILLES (COUPLES + ENFANTS) */}
          <div className="card card-gold">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1rem" }}>
              <div>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 800 }}>
                  👨‍👩‍👧‍👦 Les Familles : Couples & Enfants ({totalAdultsCount} adultes & {totalKidsCount} enfants)
                </h2>
                <p style={{ fontSize: "0.86rem", color: "#cbd5e1" }}>
                  Formez/ajustez les couples, ajoutez les enfants et choisissez directement la <strong>chambre des parents</strong> et la <strong>chambre des enfants</strong> dans les menus déroulants : les 10 chambres ci-dessous se mettent à jour toutes seules !
                </p>
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: "1.2rem" }}>
              {families.map((fam) => {
                const kids = Array.isArray(fam.children) ? fam.children : [];
                const childDraft = newChildByFam[fam.id] || { name: "", age: "" };
                return (
                  <div key={fam.id} className="family-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
                          <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#fbbf24" }}>
                            💑 {fam.coupleName}
                          </h3>
                          {fam.origin && <span className="badge badge-sky">{fam.origin}</span>}
                        </div>
                        <div style={{ fontSize: "0.82rem", color: "#cbd5e1", marginTop: "0.2rem" }}>
                          Adultes : <strong>{(fam.adults || []).join(" & ") || "À définir"}</strong>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "0.35rem" }}>
                        <button
                          type="button"
                          onClick={() => openFamilyEditor(fam)}
                          className="btn btn-secondary"
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                          title="Modifier les prénoms du couple ou choisir un couple d'amis"
                        >
                          <Edit3 size={13} /> Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteFamily(fam.id)}
                          className="btn btn-danger"
                          style={{ padding: "0.3rem 0.5rem", fontSize: "0.75rem" }}
                          title="Supprimer cette famille"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Children list + Add Child */}
                    <div
                      style={{
                        background: "rgba(30, 41, 59, 0.65)",
                        padding: "0.65rem 0.75rem",
                        borderRadius: "10px",
                        border: "1px solid var(--border-subtle)"
                      }}
                    >
                      <div style={{ fontSize: "0.78rem", color: "#7dd3fc", fontWeight: 700, marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <Baby size={15} /> Enfants de la famille ({kids.length}) :
                      </div>

                      {kids.length === 0 ? (
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic", marginBottom: "0.45rem" }}>
                          Pas d'enfant inscrit pour ce couple
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.55rem" }}>
                          {kids.map((child, idx) => (
                            <span
                              key={idx}
                              className="badge badge-emerald"
                              style={{ padding: "0.28rem 0.6rem", fontSize: "0.8rem" }}
                            >
                              👶 {child.name} {child.age ? `(${child.age})` : ""}
                              <button
                                type="button"
                                onClick={() => removeChildFromFamily(fam, idx)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#fda4af",
                                  cursor: "pointer",
                                  fontWeight: 800,
                                  marginLeft: "0.3rem"
                                }}
                                title="Retirer cet enfant"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Quick add child inputs */}
                      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                        <input
                          type="text"
                          className="input"
                          style={{ flex: "1 1 110px", padding: "0.38rem 0.6rem", fontSize: "0.8rem" }}
                          placeholder="+ Prénom enfant..."
                          value={childDraft.name}
                          onChange={(e) =>
                            setNewChildByFam((prev) => ({
                              ...prev,
                              [fam.id]: { ...childDraft, name: e.target.value }
                            }))
                          }
                        />
                        <input
                          type="text"
                          className="input"
                          style={{ width: "85px", padding: "0.38rem 0.55rem", fontSize: "0.8rem" }}
                          placeholder="Âge (5 ans)"
                          value={childDraft.age}
                          onChange={(e) =>
                            setNewChildByFam((prev) => ({
                              ...prev,
                              [fam.id]: { ...childDraft, age: e.target.value }
                            }))
                          }
                        />
                        <button
                          type="button"
                          onClick={() => addChildToFamily(fam)}
                          className="btn btn-secondary"
                          style={{ padding: "0.38rem 0.65rem", fontSize: "0.78rem" }}
                        >
                          + Enfant
                        </button>
                      </div>
                    </div>

                    {/* Direct Room Assignment Selectors */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.55rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.74rem", color: "#fbbf24", fontWeight: 700, marginBottom: "0.2rem" }}>
                          🛏️ Chambre du Couple :
                        </label>
                        <select
                          className="select"
                          style={{ padding: "0.42rem 0.55rem", fontSize: "0.8rem" }}
                          value={fam.adultRoomId || ""}
                          onChange={(e) => assignFamilyAdultsToRoom(fam, e.target.value)}
                        >
                          <option value="">-- Non affectée --</option>
                          {rooms.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.74rem", color: "#38bdf8", fontWeight: 700, marginBottom: "0.2rem" }}>
                          🧸 Chambre des Enfants :
                        </label>
                        <select
                          className="select"
                          style={{ padding: "0.42rem 0.55rem", fontSize: "0.8rem" }}
                          value={fam.kidsRoomId || ""}
                          onChange={(e) => assignFamilyKidsToRoom(fam, e.target.value)}
                          disabled={kids.length === 0}
                        >
                          <option value="">{kids.length === 0 ? "Aucun enfant" : "-- Choisir chambre --"}</option>
                          {rooms.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Deposit 100€/adult checkbox */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.3rem", borderTop: "1px solid var(--border-subtle)", fontSize: "0.78rem" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", cursor: "pointer", color: fam.depositPaid ? "#34d399" : "#94a3b8" }}>
                        <input
                          type="checkbox"
                          checked={!!fam.depositPaid}
                          onChange={() => toggleFamilyDeposit(fam)}
                          style={{ accentColor: "#10b981", width: 15, height: 15 }}
                        />
                        <span>Acompte 100 €/adulte réglé (Tricount / Fortuneo)</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add a new Couple / Family */}
            <form
              onSubmit={handleCreateNewFamily}
              style={{
                background: "rgba(15, 23, 42, 0.65)",
                padding: "0.9rem",
                borderRadius: "12px",
                border: "1px solid var(--border-subtle)",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                gap: "0.6rem"
              }}
            >
              <input
                type="text"
                className="input"
                placeholder="Adulte 1 (ex: Morgane)"
                value={newFamAdult1}
                onChange={(e) => setNewFamAdult1(e.target.value)}
                required
              />
              <input
                type="text"
                className="input"
                placeholder="Adulte 2 (ex: Jean-Philippe)"
                value={newFamAdult2}
                onChange={(e) => setNewFamAdult2(e.target.value)}
              />
              <input
                type="text"
                className="input"
                placeholder="Enfants (ex: France 7a, Briac 6a)"
                value={newFamKidsText}
                onChange={(e) => setNewFamKidsText(e.target.value)}
              />
              <input
                type="text"
                className="input"
                placeholder="Ville / Team (ex: Team Nice)"
                value={newFamOrigin}
                onChange={(e) => setNewFamOrigin(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">
                <Plus size={16} /> Ajouter un Couple / Famille
              </button>
            </form>
          </div>

          {/* SECTION 2: LES 10 CHAMBRES DU CHÂTEAU */}
          <div className="card">
            <h2 style={{ fontSize: "1.22rem", fontWeight: 800, marginBottom: "0.3rem" }}>
              🏰 Vue des 10 Chambres du Château des Cœurs
            </h2>
            <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              6 chambres doubles adultes + 4 chambres lits simples / dortoir enfants (19 lits au total, draps et serviettes de toilette fournis).
            </p>

            <div className="grid-3">
              {rooms.map((room) => {
                const occupants = Array.isArray(room.occupants) ? room.occupants : [];
                const isKids = room.type === "kids";
                return (
                  <div key={room.id} className="card room-card" style={{ background: "rgba(15, 23, 42, 0.55)" }}>
                    {room.photoUrl && (
                      <div className="room-img-wrap">
                        <img src={room.photoUrl} alt={room.name} loading="lazy" />
                        <span
                          className={`badge ${isKids ? "badge-sky" : "badge-gold"}`}
                          style={{ position: "absolute", top: 10, left: 10, background: "rgba(15, 23, 42, 0.88)" }}
                        >
                          {isKids ? "🧸 Ch. Lits Simples / Enfants" : "👑 Chambre Double Adulte"}
                        </span>
                      </div>
                    )}

                    <div className="room-body">
                      <div>
                        <h3 style={{ fontSize: "1.02rem", fontWeight: 700 }}>{room.name}</h3>
                        <div style={{ fontSize: "0.8rem", color: "#fbbf24", fontWeight: 600 }}>
                          {room.capacityLabel || `${room.capacity} places`} • {room.floor}
                        </div>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                          {room.description}
                        </p>
                      </div>

                      <div
                        style={{
                          background: "rgba(15, 23, 42, 0.7)",
                          borderRadius: "10px",
                          padding: "0.65rem",
                          border: "1px solid var(--border-subtle)"
                        }}
                      >
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
                          Occupants inscrits ({occupants.length}) :
                        </div>
                        {occupants.length === 0 ? (
                          <div style={{ fontSize: "0.8rem", color: "#64748b", fontStyle: "italic" }}>
                            Chambre libre — personne d'inscrit
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                            {occupants.map((occ) => (
                              <span
                                key={occ}
                                className="badge badge-emerald"
                                style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.28rem 0.55rem" }}
                              >
                                {occ}
                                <button
                                  type="button"
                                  onClick={() => removeOccupantFromRoom(room, occ)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "#fda4af",
                                    cursor: "pointer",
                                    fontWeight: 800,
                                    marginLeft: "0.15rem"
                                  }}
                                  title="Retirer"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: "0.4rem", marginTop: "auto" }}>
                        <input
                          type="text"
                          className="input"
                          style={{ padding: "0.42rem 0.6rem", fontSize: "0.8rem" }}
                          placeholder="Prénom à ajouter..."
                          value={newOccupantByRoom[room.id] || ""}
                          onChange={(e) =>
                            setNewOccupantByRoom((prev) => ({ ...prev, [room.id]: e.target.value }))
                          }
                        />
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ padding: "0.42rem 0.65rem", fontSize: "0.78rem", whiteSpace: "nowrap" }}
                          onClick={() =>
                            addOccupantToRoom(
                              room,
                              newOccupantByRoom[room.id]?.trim() || userDisplayName
                            )
                          }
                        >
                          + {newOccupantByRoom[room.id]?.trim() ? "Ajouter" : "Moi"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: 22 ACTIVITÉS ILLUSTRÉES (CHAUD 🔥 / PAS CHAUD ❄️) ==================== */}
      {activeTab === "activities" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="card card-gold">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.85rem" }}>
              <div>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "0.25rem" }}>
                  🔥 Activités autour de Maleville : Chaud ou Pas Chaud ?
                </h2>
                <p style={{ fontSize: "0.86rem", color: "#cbd5e1" }}>
                  Cheval, poney, tir à l'arc, randos dans les gorges, cités médiévales, grottes, aligot géant, piscine 26°C & spa : clique sur{" "}
                  <strong>« 🔥 Chaud »</strong> ou <strong>« ❄️ Pas chaud »</strong> sur chaque carte !
                </p>
              </div>
              <button
                type="button"
                onClick={syncAll22Activities}
                className="btn btn-secondary"
                style={{ fontSize: "0.78rem", padding: "0.42rem 0.75rem" }}
                title="Réinitialiser / synchroniser les 22 activités illustrées"
              >
                <RefreshCw size={14} /> Synchroniser les 22 idées
              </button>
            </div>

            {/* Category filter pills */}
            <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              {[
                "Toutes",
                "Sport & Aventure",
                "Rando & Nature",
                "Visite & Patrimoine",
                "Terroir & Gastronomie",
                "Sur place au Château"
              ].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActCategoryFilter(cat)}
                  className={`btn ${actCategoryFilter === cat ? "btn-primary" : "btn-secondary"}`}
                  style={{ padding: "0.42rem 0.85rem", fontSize: "0.8rem" }}
                >
                  {cat === "Toutes" ? `Toutes (${activities.length})` : cat}
                </button>
              ))}
            </div>

            {/* Propose new activity form */}
            <form
              onSubmit={handleAddActivity}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))",
                gap: "0.55rem",
                background: "rgba(15, 23, 42, 0.65)",
                padding: "0.85rem",
                borderRadius: "12px",
                border: "1px solid var(--border-subtle)"
              }}
            >
              <input
                type="text"
                className="input"
                placeholder="Proposer une autre activité..."
                value={newActTitle}
                onChange={(e) => setNewActTitle(e.target.value)}
                required
              />
              <select className="select" value={newActCat} onChange={(e) => setNewActCat(e.target.value)}>
                <option value="Sport & Aventure">🏇 Sport & Aventure</option>
                <option value="Rando & Nature">🥾 Rando & Nature</option>
                <option value="Visite & Patrimoine">🏰 Visite & Patrimoine</option>
                <option value="Terroir & Gastronomie">🧀 Terroir & Gastronomie</option>
                <option value="Sur place au Château">🏡 Sur place au Château</option>
              </select>
              <input
                type="text"
                className="input"
                placeholder="Distance / Jour (ex: À 20 min)"
                value={newActDay}
                onChange={(e) => setNewActDay(e.target.value)}
              />
              <input
                type="text"
                className="input"
                placeholder="Description rapide..."
                value={newActDesc}
                onChange={(e) => setNewActDesc(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">
                <Plus size={16} /> Ajouter
              </button>
            </form>
          </div>

          {/* Grid of Activity Cards with Background Image & Hot/Cold Voting */}
          <div className="grid-2">
            {filteredActivities.map((act) => {
              const hotVotes = Array.isArray(act.votesHot) ? act.votesHot : Array.isArray(act.votes) ? act.votes : [];
              const coldVotes = Array.isArray(act.votesCold) ? act.votesCold : [];
              const iVotedHot = hotVotes.includes(userDisplayName);
              const iVotedCold = coldVotes.includes(userDisplayName);
              const bgImg = act.imageUrl || DEFAULT_CATEGORY_IMAGES[act.category] || DEFAULT_CATEGORY_IMAGES["Sport & Aventure"];

              return (
                <div
                  key={act.id}
                  className="activity-bg-card"
                  style={{ backgroundImage: `url("${bgImg}")` }}
                >
                  <div className="activity-bg-overlay">
                    {/* Top badges */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", flexWrap: "wrap" }}>
                      <span className="badge badge-gold" style={{ background: "rgba(15, 23, 42, 0.85)", backdropFilter: "blur(6px)" }}>
                        {act.category}
                      </span>
                      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                        {act.day && (
                          <span className="badge badge-sky" style={{ background: "rgba(15, 23, 42, 0.85)", backdropFilter: "blur(6px)" }}>
                            📍 {act.day}
                          </span>
                        )}
                        {act.duration && (
                          <span className="badge" style={{ background: "rgba(15, 23, 42, 0.85)", color: "#e2e8f0" }}>
                            ⏱️ {act.duration}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content & Votes at bottom */}
                    <div style={{ marginTop: "auto" }}>
                      <h3 style={{ fontSize: "1.12rem", fontWeight: 800, marginBottom: "0.35rem", textShadow: "0 2px 6px rgba(0,0,0,0.8)" }}>
                        {act.title}
                      </h3>
                      <p style={{ fontSize: "0.84rem", color: "#e2e8f0", marginBottom: "0.85rem", lineHeight: 1.45 }}>
                        {act.description}
                      </p>

                      {/* Voters breakdown */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "0.75rem", fontSize: "0.78rem" }}>
                        {hotVotes.length > 0 && (
                          <div style={{ color: "#fbbf24", fontWeight: 600 }}>
                            🔥 <strong>Chauds ({hotVotes.length}) :</strong> {hotVotes.join(", ")}
                          </div>
                        )}
                        {coldVotes.length > 0 && (
                          <div style={{ color: "#93c5fd" }}>
                            ❄️ <strong>Pas chauds ({coldVotes.length}) :</strong> {coldVotes.join(", ")}
                          </div>
                        )}
                      </div>

                      {/* Hot / Cold Vote Buttons */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                        <button
                          type="button"
                          onClick={() => voteActivityHot(act)}
                          className={`btn btn-hot ${iVotedHot ? "active" : ""}`}
                          style={{ padding: "0.55rem 0.75rem", fontSize: "0.84rem" }}
                        >
                          <Flame size={16} /> {iVotedHot ? "Je suis CHAUD !" : "Chaud 🔥"} ({hotVotes.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => voteActivityCold(act)}
                          className={`btn btn-cold ${iVotedCold ? "active" : ""}`}
                          style={{ padding: "0.55rem 0.75rem", fontSize: "0.84rem" }}
                        >
                          <Snowflake size={16} /> {iVotedCold ? "Pas chaud ❄️" : "Pas chaud"} ({coldVotes.length})
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== TAB 4: REPAS & COURSES ==================== */}
      {activeTab === "meals" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Section A: Meal Schedule */}
          <div className="card card-gold">
            <div style={{ marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>
                🍽️ Tableau des Repas (26 Déc. → 2 Janv.)
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Clique sur <strong>« Je cuisine ! »</strong> pour rejoindre la brigade d'un repas ou sur <strong>« Modifier »</strong> pour changer le menu.
              </p>
            </div>

            <div className="grid-2">
              {meals.map((meal) => {
                const isNYE = meal.id.includes("12-31-soir");
                return (
                  <div
                    key={meal.id}
                    style={{
                      padding: "1rem",
                      borderRadius: "14px",
                      background: isNYE
                        ? "linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(15, 23, 42, 0.9))"
                        : "rgba(15, 23, 42, 0.65)",
                      border: isNYE ? "1px solid #f59e0b" : "1px solid var(--border-subtle)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "0.65rem"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                        <span className={`badge ${isNYE ? "badge-gold" : "badge-sky"}`}>
                          {meal.day} • {meal.slot}
                        </span>
                        <button
                          type="button"
                          onClick={() => openMealEditor(meal)}
                          className="btn btn-secondary"
                          style={{ padding: "0.28rem 0.6rem", fontSize: "0.76rem" }}
                        >
                          <Edit3 size={13} /> Modifier
                        </button>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: "0.98rem", marginBottom: "0.3rem" }}>
                        {meal.menu || "Menu à définir"}
                      </div>
                      <div style={{ fontSize: "0.83rem", color: "#cbd5e1" }}>
                        👨‍🍳 <strong>Brigade :</strong> {meal.cooks || "À définir"}
                      </div>
                      {meal.notes && (
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                          💡 {meal.notes}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                      <button
                        type="button"
                        onClick={() => joinMealBrigade(meal)}
                        className="btn btn-secondary"
                        style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
                      >
                        🙋‍♂️ Je cuisine ({userDisplayName})
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section B: Groceries & Regional Specialties */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1rem" }}>
              <div>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 800 }}>
                  🛒 Liste de Courses & Spécialités des Régions
                </h2>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Ajoute ce qu'il faut acheter au Drive de Villefranche ou ce que tu ramènes de ta région !
                </p>
              </div>

              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {["Toutes", "Spécialités Régionales", "Boissons & Apéro", "Enfants & Petit-déj", "Maison & Essentiels"].map(
                  (cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setGroceryFilter(cat)}
                      className={`btn ${groceryFilter === cat ? "btn-primary" : "btn-secondary"}`}
                      style={{ padding: "0.38rem 0.75rem", fontSize: "0.78rem" }}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Add Grocery Form */}
            <form
              onSubmit={handleAddGrocery}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "0.6rem",
                marginBottom: "1.2rem",
                padding: "0.9rem",
                background: "rgba(15, 23, 42, 0.55)",
                borderRadius: "12px",
                border: "1px solid var(--border-subtle)"
              }}
            >
              <input
                type="text"
                className="input"
                placeholder="Produit ou spécialité (ex: 4 bouteilles de Champagne...)"
                value={newGroceryLabel}
                onChange={(e) => setNewGroceryLabel(e.target.value)}
                required
              />
              <select
                className="select"
                value={newGroceryCategory}
                onChange={(e) => setNewGroceryCategory(e.target.value)}
              >
                <option value="Spécialités Régionales">🧀 Spécialités Régionales</option>
                <option value="Boissons & Apéro">🍾 Boissons & Apéro</option>
                <option value="Enfants & Petit-déj">🥞 Enfants & Petit-déj</option>
                <option value="Maison & Essentiels">🧻 Maison & Essentiels</option>
              </select>
              <input
                type="text"
                className="input"
                placeholder={`Qui s'en occupe ? (défaut: ${userDisplayName})`}
                value={newGroceryWho}
                onChange={(e) => setNewGroceryWho(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">
                <Plus size={16} /> Ajouter à la liste
              </button>
            </form>

            {/* Grocery Items List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {filteredGroceries.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    padding: "0.7rem 0.9rem",
                    borderRadius: "12px",
                    background: item.checked ? "rgba(15, 23, 42, 0.35)" : "rgba(15, 23, 42, 0.7)",
                    border: "1px solid var(--border-subtle)",
                    opacity: item.checked ? 0.6 : 1
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      cursor: "pointer",
                      flex: 1
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!item.checked}
                      onChange={() => toggleGroceryChecked(item)}
                      style={{ width: 18, height: 18, accentColor: "#10b981", cursor: "pointer" }}
                    />
                    <div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "0.92rem",
                          textDecoration: item.checked ? "line-through" : "none"
                        }}
                      >
                        {item.label}
                      </div>
                      <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", marginTop: "0.2rem" }}>
                        <span className="badge badge-gold">{item.category}</span>
                        {item.broughtBy && (
                          <span className="badge badge-emerald">Par : {item.broughtBy}</span>
                        )}
                      </div>
                    </div>
                  </label>

                  <button
                    type="button"
                    onClick={() => deleteGroceryItem(item.id)}
                    className="btn btn-danger"
                    style={{ padding: "0.4rem 0.55rem" }}
                    title="Supprimer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 5: GOOGLE PHOTOS (2027 & SOUVENIRS 2026) ==================== */}
      {activeTab === "photos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="grid-2">
            {/* Album Officiel Nouvel An 2027 */}
            <div className="card card-gold" style={{ textAlign: "center", padding: "1.85rem 1.25rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <span className="badge badge-gold" style={{ marginBottom: "0.6rem" }}>
                  ✨ ALBUM OFFICIEL DU SÉJOUR
                </span>
                <h2 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: "0.45rem" }}>
                  📸 Google Photos • Nouvel An 2027
                </h2>
                <p style={{ fontSize: "0.88rem", color: "#cbd5e1", marginBottom: "1.25rem" }}>
                  Toutes les photos et vidéos du Château des Cœurs à Maleville (les enfants à la piscine, les balades en Aveyron, la soirée du Réveillon) en qualité originale :
                </p>
              </div>
              <a
                href={links.googlePhotosUrl || GITE_INFO.googlePhotosUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-photos"
                style={{ padding: "0.85rem 1.4rem", fontSize: "0.95rem" }}
              >
                <Camera size={20} /> Ouvrir l'Album Nouvel An 2027 <ExternalLink size={16} />
              </a>
            </div>

            {/* Album Souvenirs Nouvel An 2026 */}
            <div className="card" style={{ textAlign: "center", padding: "1.85rem 1.25rem", borderColor: "rgba(56, 189, 248, 0.4)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <span className="badge badge-sky" style={{ marginBottom: "0.6rem" }}>
                  🎞️ DOSSIER SOUVENIRS DE L'AN DERNIER
                </span>
                <h2 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: "0.45rem" }}>
                  🥂 Souvenirs • Nouvel An 2026
                </h2>
                <p style={{ fontSize: "0.88rem", color: "#cbd5e1", marginBottom: "1.25rem" }}>
                  Pour se remettre dans l'ambiance et revoir toutes les pépites de l'édition précédente entre potes et avec les enfants :
                </p>
              </div>
              <a
                href={GITE_INFO.googlePhotos2026Url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ padding: "0.85rem 1.4rem", fontSize: "0.95rem", borderColor: "#38bdf8", color: "#7dd3fc" }}
              >
                <Sparkles size={19} /> Revoir l'Album Souvenirs 2026 <ExternalLink size={16} />
              </a>
            </div>
          </div>

          {/* Optional pinned highlights or sub-links */}
          <div className="card">
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.4rem" }}>
              🌟 Autres Liens & Dossiers Photos / Vidéos épinglés
            </h3>
            <p style={{ fontSize: "0.83rem", color: "var(--text-muted)", marginBottom: "0.9rem" }}>
              Tu peux aussi épingler ici un lien vers une vidéo montage, un Drive ou un sous-album :
            </p>

            <form
              onSubmit={handleAddPhotoHighlight}
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.6rem", marginBottom: "1rem" }}
            >
              <input
                type="text"
                className="input"
                placeholder="Titre (ex: Montage vidéo, Photos drone...)"
                value={newPhotoTitle}
                onChange={(e) => setNewPhotoTitle(e.target.value)}
                required
              />
              <input
                type="url"
                className="input"
                placeholder="Lien https://..."
                value={newPhotoUrl}
                onChange={(e) => setNewPhotoUrl(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary">
                <Plus size={16} /> Épingler le lien
              </button>
            </form>

            {photoHighlights.length > 0 && (
              <div className="grid-2">
                {photoHighlights.map((ph) => (
                  <a
                    key={ph.id}
                    href={ph.url}
                    target="_blank"
                    rel="noreferrer"
                    className="card"
                    style={{
                      textDecoration: "none",
                      background: "rgba(15, 23, 42, 0.65)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{ph.title}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        Ajouté par {ph.addedBy}
                      </div>
                    </div>
                    <ExternalLink size={18} color="#38bdf8" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 6: INFOS PRATIQUES (LIVRET ALINE) ==================== */}
      {activeTab === "info" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="grid-2">
            {/* Address, Wi-Fi & Contacts */}
            <div className="card card-gold">
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, marginBottom: "0.85rem" }}>
                📍 Adresse, Wi-Fi & Contacts (Contrat Aline Fillette)
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem" }}>
                <div style={{ padding: "0.75rem", background: "rgba(15,23,42,0.65)", borderRadius: "10px" }}>
                  <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: "0.8rem" }}>ADRESSE DU GÎTE</div>
                  <div style={{ fontWeight: 700, marginTop: "0.15rem" }}>{GITE_INFO.name}</div>
                  <div>{GITE_INFO.address}</div>
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                    <a href={GITE_INFO.mapsUrl} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
                      <MapPin size={14} /> Ouvrir Google Maps
                    </a>
                    <a href={GITE_INFO.airbnbUrl} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
                      Annonce Airbnb <ExternalLink size={14} />
                    </a>
                  </div>
                </div>

                <div style={{ padding: "0.75rem", background: "rgba(15,23,42,0.65)", borderRadius: "10px" }}>
                  <div style={{ color: "#38bdf8", fontWeight: 700, fontSize: "0.8rem" }}>CONNEXION WI-FI & TV</div>
                  <div>Réseau : <strong>{GITE_INFO.wifi.network}</strong></div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.25rem" }}>
                    <span>Mot de passe : <strong>{GITE_INFO.wifi.code}</strong></span>
                    <button type="button" onClick={copyWifiCode} className="btn btn-secondary" style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem" }}>
                      <Copy size={13} /> {copiedWifi ? "Copié !" : "Copier"}
                    </button>
                  </div>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
                    {GITE_INFO.wifi.note}
                  </p>
                </div>

                <div style={{ padding: "0.75rem", background: "rgba(15,23,42,0.65)", borderRadius: "10px" }}>
                  <div style={{ color: "#34d399", fontWeight: 700, fontSize: "0.8rem" }}>HORAIRES & CONTACTS</div>
                  <div>🟢 <strong>Arrivée :</strong> {GITE_INFO.checkInLabel}</div>
                  <div>🔴 <strong>Départ :</strong> {GITE_INFO.checkOutLabel}</div>
                  <div style={{ marginTop: "0.4rem", fontSize: "0.84rem", color: "#cbd5e1" }}>
                    <Phone size={13} style={{ verticalAlign: "middle" }} /> Propriétaire ({GITE_INFO.contacts.ownerName}) :{" "}
                    <a href={`tel:${GITE_INFO.contacts.ownerPhone.replace(/\s/g, "")}`} style={{ color: "#fbbf24" }}>
                      {GITE_INFO.contacts.ownerPhone}
                    </a>{" "}
                    • Fixe maison : {GITE_INFO.contacts.houseLandline}
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Packing Checklist + Budget */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.15rem" }}>
              <div className="card">
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.35rem" }}>
                  🎒 Checklist Valise (À ne pas oublier !)
                </h3>
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "0.8rem" }}>
                  ✅ Les draps et les serviettes de toilette sont fournis, mais <strong>pas les serviettes de piscine</strong> :
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {GITE_INFO.packingChecklist.map((item) => (
                    <label
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.65rem",
                        padding: "0.6rem 0.75rem",
                        background: "rgba(15,23,42,0.6)",
                        borderRadius: "10px",
                        cursor: "pointer",
                        border: item.mandatory ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid var(--border-subtle)"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!!checkedPacking[item.id]}
                        onChange={() => togglePackingItem(item.id)}
                        style={{ width: 17, height: 17, accentColor: "#f59e0b" }}
                      />
                      <span
                        style={{
                          fontSize: "0.87rem",
                          textDecoration: checkedPacking[item.id] ? "line-through" : "none",
                          color: checkedPacking[item.id] ? "#64748b" : "#f8fafc"
                        }}
                      >
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                  💶 Récap Réservation, Tricount & Budget Gîte
                </h3>
                <div style={{ fontSize: "0.86rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <div>• <strong>Forfait Semaine Nouvel An (7 nuits) :</strong> {GITE_INFO.budget.total} € TTC</div>
                  <div style={{ color: "#34d399" }}>
                    • <strong>Acompte 30% payé :</strong> {GITE_INFO.budget.depositPaid} € (virement du {GITE_INFO.budget.depositDate})
                  </div>
                  <div style={{ color: "#fbbf24" }}>
                    • <strong>Solde restant :</strong> {GITE_INFO.budget.balanceDue} € (à régler avant le {GITE_INFO.budget.balanceDeadline})
                  </div>
                  <div style={{ color: "#7dd3fc", marginTop: "0.2rem" }}>
                    • <strong>Participation acompte :</strong> {GITE_INFO.budget.paymentNote}
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.2rem" }}>
                    • Caution : chèque de {GITE_INFO.budget.securityDeposit} € non encaissé • {GITE_INFO.budget.included}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* House Rules from Aline's Booklet */}
          <div className="card">
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.85rem" }}>
              <AlertTriangle size={18} color="#f59e0b" style={{ verticalAlign: "text-bottom", marginRight: "0.35rem" }} />
              Consignes importantes du Livret d'Accueil (Aline Fillette)
            </h3>
            <div className="grid-3">
              {GITE_INFO.houseRules.map((section, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "rgba(15, 23, 42, 0.6)",
                    padding: "1rem",
                    borderRadius: "12px",
                    border: "1px solid var(--border-subtle)"
                  }}
                >
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fbbf24", marginBottom: "0.55rem" }}>
                    {section.title}
                  </h4>
                  <ul style={{ paddingLeft: "1.1rem", fontSize: "0.83rem", color: "#cbd5e1", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {section.items.map((rule, rIdx) => (
                      <li key={rIdx}>{rule}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Local Spots & Markets */}
          <div className="grid-2">
            {GITE_INFO.localSpots.map((spotGroup, idx) => (
              <div key={idx} className="card">
                <h3 style={{ fontSize: "1.08rem", fontWeight: 700, marginBottom: "0.75rem" }}>
                  {spotGroup.category}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {spotGroup.places.map((p, pIdx) => (
                    <div
                      key={pIdx}
                      style={{
                        padding: "0.65rem 0.8rem",
                        background: "rgba(15, 23, 42, 0.55)",
                        borderRadius: "10px",
                        border: "1px solid var(--border-subtle)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong style={{ fontSize: "0.9rem" }}>{p.name}</strong>
                        <span className="badge badge-sky">{p.dist}</span>
                      </div>
                      <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                        {p.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== MODAL 1: SHARED LINKS ==================== */}
      <dialog ref={linksDialogRef} closedby="any" aria-labelledby="linksDialogTitle">
        <form onSubmit={saveSharedLinks} style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          <h3 id="linksDialogTitle" style={{ fontSize: "1.2rem", fontWeight: 800 }}>
            🔗 Liens partagés du Groupe
          </h3>
          <p style={{ fontSize: "0.83rem", color: "var(--text-muted)" }}>
            Ces liens sont synchronisés en temps réel pour tous les potes connectés :
          </p>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", marginBottom: "0.25rem", color: "#38bdf8" }}>
              Lien de l'Album Google Photos Nouvel An 2027
            </label>
            <input
              type="url"
              className="input"
              placeholder="https://photos.app.goo.gl/..."
              value={linksDraft.googlePhotosUrl}
              onChange={(e) => setLinksDraft({ ...linksDraft, googlePhotosUrl: e.target.value })}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", marginBottom: "0.25rem", color: "#fbbf24" }}>
              Lien Tricount (partage des courses & frais)
            </label>
            <input
              type="url"
              className="input"
              placeholder="https://tricount.com/..."
              value={linksDraft.tricountUrl}
              onChange={(e) => setLinksDraft({ ...linksDraft, tricountUrl: e.target.value })}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", marginBottom: "0.25rem", color: "#4ade80" }}>
              Lien d'invitation Groupe WhatsApp (optionnel)
            </label>
            <input
              type="url"
              className="input"
              placeholder="https://chat.whatsapp.com/..."
              value={linksDraft.whatsappUrl}
              onChange={(e) => setLinksDraft({ ...linksDraft, whatsappUrl: e.target.value })}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", marginBottom: "0.25rem", color: "#fda4af" }}>
              Lien Playlist Spotify / Deezer du Réveillon
            </label>
            <input
              type="url"
              className="input"
              placeholder="https://open.spotify.com/playlist/..."
              value={linksDraft.playlistUrl}
              onChange={(e) => setLinksDraft({ ...linksDraft, playlistUrl: e.target.value })}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "0.5rem" }}>
            <button
              type="button"
              onClick={() => linksDialogRef.current?.close()}
              className="btn btn-secondary"
            >
              Annuler
            </button>
            <button type="submit" className="btn btn-primary">
              Enregistrer pour tout le groupe
            </button>
          </div>
        </form>
      </dialog>

      {/* ==================== MODAL 2: EDIT MEAL ==================== */}
      <dialog ref={mealDialogRef} closedby="any" aria-labelledby="mealDialogTitle">
        {editingMeal && (
          <form onSubmit={saveMealChanges} style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            <h3 id="mealDialogTitle" style={{ fontSize: "1.15rem", fontWeight: 800 }}>
              🍽️ Modifier : {editingMeal.day} ({editingMeal.slot})
            </h3>

            <div>
              <label style={{ display: "block", fontSize: "0.82rem", marginBottom: "0.25rem" }}>
                Menu prévu
              </label>
              <input
                type="text"
                className="input"
                value={editingMeal.menu}
                onChange={(e) => setEditingMeal({ ...editingMeal, menu: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.82rem", marginBottom: "0.25rem" }}>
                Qui cuisine / gère ce repas ?
              </label>
              <input
                type="text"
                className="input"
                value={editingMeal.cooks}
                onChange={(e) => setEditingMeal({ ...editingMeal, cooks: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.82rem", marginBottom: "0.25rem" }}>
                Notes / Matériel / Courses associées
              </label>
              <input
                type="text"
                className="input"
                value={editingMeal.notes || ""}
                onChange={(e) => setEditingMeal({ ...editingMeal, notes: e.target.value })}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "0.5rem" }}>
              <button
                type="button"
                onClick={() => mealDialogRef.current?.close()}
                className="btn btn-secondary"
              >
                Annuler
              </button>
              <button type="submit" className="btn btn-primary">
                Enregistrer le repas
              </button>
            </div>
          </form>
        )}
      </dialog>

      {/* ==================== MODAL 3: EDIT FAMILY / COUPLE ==================== */}
      <dialog ref={familyDialogRef} closedby="any" aria-labelledby="familyDialogTitle">
        {editingFamily && (
          <form onSubmit={saveFamilyChanges} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <h3 id="familyDialogTitle" style={{ fontSize: "1.15rem", fontWeight: 800 }}>
              💑 Modifier le Couple / la Famille
            </h3>

            {/* Presets of friends */}
            <div>
              <div style={{ fontSize: "0.76rem", color: "#fbbf24", fontWeight: 700, marginBottom: "0.35rem" }}>
                ⚡ Remplissage rapide (Couples d'amis du groupe) :
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                {FRIEND_COUPLE_PRESETS.map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applyPresetToEditingFamily(preset)}
                    className="btn btn-secondary"
                    style={{ padding: "0.28rem 0.55rem", fontSize: "0.74rem" }}
                  >
                    {preset.adults.join(" & ")}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", marginBottom: "0.2rem" }}>
                Nom affiché du couple / famille
              </label>
              <input
                type="text"
                className="input"
                value={editingFamily.coupleName}
                onChange={(e) => setEditingFamily({ ...editingFamily, coupleName: e.target.value })}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", marginBottom: "0.2rem" }}>
                  Adulte 1
                </label>
                <input
                  type="text"
                  className="input"
                  value={editingFamily.adult1}
                  onChange={(e) => setEditingFamily({ ...editingFamily, adult1: e.target.value })}
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", marginBottom: "0.2rem" }}>
                  Adulte 2
                </label>
                <input
                  type="text"
                  className="input"
                  value={editingFamily.adult2}
                  onChange={(e) => setEditingFamily({ ...editingFamily, adult2: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", marginBottom: "0.2rem" }}>
                Ville / Team
              </label>
              <input
                type="text"
                className="input"
                value={editingFamily.origin || ""}
                onChange={(e) => setEditingFamily({ ...editingFamily, origin: e.target.value })}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "0.4rem" }}>
              <button
                type="button"
                onClick={() => familyDialogRef.current?.close()}
                className="btn btn-secondary"
              >
                Annuler
              </button>
              <button type="submit" className="btn btn-primary">
                Enregistrer la famille
              </button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
}

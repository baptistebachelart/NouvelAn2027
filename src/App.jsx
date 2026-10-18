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
  Car,
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
  STAY_DAYS,
  INITIAL_ROOMS,
  INITIAL_MEALS,
  INITIAL_MEAL_IDEAS,
  GOOGLE_PHOTOS_2026_PREVIEWS,
  INITIAL_GROCERIES,
  INITIAL_ACTIVITIES
} from "./data/giteData";
import ActivitiesMap from "./components/ActivitiesMap";

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
  "Terroir & Gastronomie": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Bol_d%27aligot.jpg/1280px-Bol_d%27aligot.jpg"
};

const REMOVED_HOME_ACTIVITY_IDS = [
  "act-1",
  "act-2",
  "act-3",
  "act-4",
  "act-5",
  "act-6",
  "act-20-aligot-geant-chef-chateau",
  "act-21-piscine-hammam-sauna",
  "act-22-cinema-blindtest-loupgarou"
];

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
  const [mealIdeas, setMealIdeas] = useState(INITIAL_MEAL_IDEAS);
  const [groceries, setGroceries] = useState(INITIAL_GROCERIES);
  const [activities, setActivities] = useState(INITIAL_ACTIVITIES);
  const [photoHighlights, setPhotoHighlights] = useState([]);

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

  // Meal idea form
  const [newMealIdeaTitle, setNewMealIdeaTitle] = useState("");
  const [newMealIdeaCooks, setNewMealIdeaCooks] = useState("");
  const [newMealIdeaSlotId, setNewMealIdeaSlotId] = useState("");

  // Grocery form
  const [newGroceryLabel, setNewGroceryLabel] = useState("");
  const [newGroceryCategory, setNewGroceryCategory] = useState("Spécialités Régionales");
  const [newGroceryWho, setNewGroceryWho] = useState("");
  const [groceryFilter, setGroceryFilter] = useState("Toutes");

  // Activities states & filters
  const [actCategoryFilter, setActCategoryFilter] = useState("Toutes");
  const [newActTitle, setNewActTitle] = useState("");
  const [newActCat, setNewActCat] = useState("Sport & Aventure");
  const [newActDay, setNewActDay] = useState("");
  const [newActDesc, setNewActDesc] = useState("");
  const [newActImg, setNewActImg] = useState("");
  const [newActWebsiteUrl, setNewActWebsiteUrl] = useState("");

  const [newOccupantByRoom, setNewOccupantByRoom] = useState({});
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

  // Native <dialog closedby="any"> fallback
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

    // 1. Settings / Links
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
      },
      (err) => console.warn("Users listener warning:", err.message)
    );

    // 3. Families (Ensure all 12 families exist & clean up old duplicate IDs)
    const unsubFamilies = onSnapshot(
      collection(db, "families"),
      async (snap) => {
        const existingIds = new Set(snap.docs.map((d) => d.id));
        const legacyFamIds = [
          "fam-baptiste-lulu",
          "fam-remi-mc",
          "fam-matthieu-maud",
          "fam-antoine-rachel",
          "fam-guillaume-elizabeth",
          "fam-vincent-hortense",
          "fam-famille-7"
        ];
        for (const oldId of legacyFamIds) {
          if (existingIds.has(oldId)) {
            await deleteDoc(doc(db, "families", oldId)).catch(() => {});
          }
        }

        const missingFams = INITIAL_FAMILIES.filter((f) => !existingIds.has(f.id));
        if (missingFams.length > 0) {
          for (const fam of missingFams) {
            await setDoc(doc(db, "families", fam.id), {
              name: fam.coupleName,
              city: fam.origin,
              adults: fam.adults,
              kids: fam.children,
              arrivalTime: `${fam.arrivalDate || "Sam. 26 Déc."} • ${fam.arrivalTime || "À préciser"}`,
              departureTime: `${fam.departureDate || "Sam. 2 Janv."} • ${fam.departureTime || "À préciser"}`,
              transport: fam.transport || "Voiture",
              adultRoomId: fam.adultRoomId || "",
              kidsRoomId: fam.kidsRoomId || "",
              depositPaid: !!fam.depositPaid,
              updatedAt: Date.now()
            }).catch(() => {});
          }
        }

        if (!snap.empty) {
          const initialMap = Object.fromEntries(INITIAL_FAMILIES.map((f) => [f.id, f]));
          const loaded = snap.docs
            .filter((d) => !legacyFamIds.includes(d.id))
            .map((d) => {
              const data = d.data();
              const preset = initialMap[d.id] || {};
              const [arrDatePart, arrTimePart] = (data.arrivalTime || "").includes("•")
                ? data.arrivalTime.split("•").map((s) => s.trim())
                : [preset.arrivalDate || "Sam. 26 Déc.", data.arrivalTime || preset.arrivalTime || "À préciser"];
              const [depDatePart, depTimePart] = (data.departureTime || "").includes("•")
                ? data.departureTime.split("•").map((s) => s.trim())
                : [preset.departureDate || "Sam. 2 Janv.", data.departureTime || preset.departureTime || "À préciser"];

              return {
                id: d.id,
                coupleName: data.name || data.coupleName || preset.coupleName || "Couple",
                origin: data.city || data.origin || preset.origin || "",
                adults: Array.isArray(data.adults) ? data.adults : preset.adults || [],
                children: Array.isArray(data.kids)
                  ? data.kids
                  : Array.isArray(data.children)
                  ? data.children
                  : preset.children || [],
                arrivalDate: arrDatePart || "Sam. 26 Déc.",
                arrivalTime: arrTimePart || "À préciser",
                departureDate: depDatePart || "Sam. 2 Janv.",
                departureTime: depTimePart || "À préciser",
                transport: data.transport || preset.transport || "Voiture",
                adultRoomId: data.adultRoomId !== undefined ? data.adultRoomId : preset.adultRoomId || "",
                kidsRoomId: data.kidsRoomId !== undefined ? data.kidsRoomId : preset.kidsRoomId || "",
                depositPaid: data.depositPaid !== undefined ? !!data.depositPaid : !!preset.depositPaid
              };
            });
          loaded.sort((a, b) => a.id.localeCompare(b.id));
          if (loaded.length > 0) {
            setFamilies(loaded);
          }
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

    // 5. Meals (Agenda 7 jours) + Meal Ideas (stockées dans polls/meal-ideas)
    const unsubMeals = onSnapshot(
      collection(db, "meals"),
      async (snap) => {
        if (snap.empty) {
          for (const m of INITIAL_MEALS) {
            await setDoc(doc(db, "meals", m.id), {
              day: m.day,
              slot: m.slot,
              menu: m.menu || "",
              cooks: m.cooks || "",
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

    const unsubMealIdeas = onSnapshot(
      doc(db, "polls", "meal-ideas-board"),
      async (snap) => {
        if (!snap.exists()) {
          await setDoc(doc(db, "polls", "meal-ideas-board"), {
            title: "Propositions de Repas & Qui s'en occupe",
            options: INITIAL_MEAL_IDEAS,
            updatedAt: Date.now()
          }).catch(() => {});
        } else {
          const data = snap.data();
          if (Array.isArray(data.options)) {
            setMealIdeas(data.options);
          }
        }
      },
      (err) => console.warn("Meal ideas listener warning:", err.message)
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

    // 7. Activities (Remove home activities & enrich with GPS + distanceFromGite)
    const unsubActivities = onSnapshot(
      collection(db, "activities"),
      async (snap) => {
        const existingIds = new Set(snap.docs.map((d) => d.id));
        for (const remId of REMOVED_HOME_ACTIVITY_IDS) {
          if (existingIds.has(remId)) {
            await deleteDoc(doc(db, "activities", remId)).catch(() => {});
          }
        }

        const missingNewActs = INITIAL_ACTIVITIES.filter((a) => !existingIds.has(a.id));
        if (missingNewActs.length > 0) {
          for (const a of missingNewActs) {
            await setDoc(doc(db, "activities", a.id), {
              title: a.title,
              category: a.category,
              day: a.distanceFromGite || a.day,
              duration: a.duration,
              description: a.description,
              imageUrl: a.imageUrl,
              websiteUrl: a.websiteUrl || "",
              websiteLabel: a.websiteLabel || "Voir le site officiel",
              proposedBy: a.proposedBy,
              votes: a.votesHot || [],
              votesHot: a.votesHot || [],
              votesCold: a.votesCold || [],
              createdAt: Date.now()
            }).catch(() => {});
          }
        }

        if (!snap.empty) {
          const initialById = Object.fromEntries(INITIAL_ACTIVITIES.map((a) => [a.id, a]));
          const loaded = snap.docs
            .filter(
              (d) =>
                !REMOVED_HOME_ACTIVITY_IDS.includes(d.id) &&
                d.data()?.category !== "Sur place au Château"
            )
            .map((d) => {
              const data = d.data();
              const preset = initialById[d.id] || {};
              const votesHot = Array.isArray(data.votesHot)
                ? data.votesHot
                : Array.isArray(data.votes)
                ? data.votes
                : [];
              const votesCold = Array.isArray(data.votesCold) ? data.votesCold : [];
              return {
                id: d.id,
                ...preset,
                ...data,
                title: preset.title || data.title,
                description: preset.description || data.description,
                distanceFromGite: preset.distanceFromGite || data.day || "Autour du gîte",
                locationName: preset.locationName || data.title,
                lat: preset.lat,
                lng: preset.lng,
                imageUrl: data.imageUrl || preset.imageUrl || "",
                websiteUrl: data.websiteUrl || preset.websiteUrl || "",
                websiteLabel: data.websiteLabel || preset.websiteLabel || "Voir le site / Infos",
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

    // 8. Photo highlights
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
      unsubMealIdeas();
      unsubGroceries();
      unsubActivities();
      unsubPhotos();
    };
  }, [user]);

  const userDisplayName =
    user?.displayName ||
    members.find((m) => m.id === user?.uid)?.firstName ||
    user?.email?.split("@")[0] ||
    "Pote";

  // Helper list of all adults/couples for quick assignment dropdowns
  const allAssigneesList = [
    "À définir",
    "Tout le monde",
    userDisplayName,
    ...families.map((f) => (f.adults || []).join(" & ")).filter(Boolean),
    ...families.flatMap((f) => f.adults || []).filter(Boolean)
  ].filter((v, idx, arr) => v && arr.indexOf(v) === idx);

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

  // ==================== FAMILIES, ARRIVAL/DEPARTURE & BEDROOM ACTIONS ====================
  const saveFamilyDoc = async (fam, overrides = {}) => {
    const merged = { ...fam, ...overrides };
    await setDoc(
      doc(db, "families", merged.id),
      {
        name: merged.coupleName,
        city: merged.origin || "",
        adults: merged.adults || [],
        kids: merged.children || [],
        arrivalTime: `${merged.arrivalDate || "Sam. 26 Déc."} • ${merged.arrivalTime || "À préciser"}`,
        departureTime: `${merged.departureDate || "Sam. 2 Janv."} • ${merged.departureTime || "À préciser"}`,
        transport: merged.transport || "Voiture",
        adultRoomId: merged.adultRoomId || "",
        kidsRoomId: merged.kidsRoomId || "",
        depositPaid: !!merged.depositPaid,
        updatedAt: Date.now()
      },
      { merge: true }
    );
  };

  const updateFamilySchedule = async (fam, field, value) => {
    await saveFamilyDoc(fam, { [field]: value });
  };

  const assignFamilyAdultsToRoom = async (fam, targetRoomId) => {
    const prevRoomId = fam.adultRoomId;
    const adultNames = Array.isArray(fam.adults) ? fam.adults.filter(Boolean) : [];

    await saveFamilyDoc(fam, { adultRoomId: targetRoomId });

    if (prevRoomId && prevRoomId !== targetRoomId) {
      const oldRoom = rooms.find((r) => r.id === prevRoomId);
      if (oldRoom) {
        const filtered = (oldRoom.occupants || []).filter((occ) => !adultNames.includes(occ));
        await updateDoc(doc(db, "rooms", oldRoom.id), { occupants: filtered, updatedAt: Date.now() }).catch(() => {});
      }
    }

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

    await saveFamilyDoc(fam, { kidsRoomId: targetRoomId });

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
    await saveFamilyDoc(fam, { children: nextChildren });

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
    await saveFamilyDoc(fam, { children: nextChildren });

    if (removed && fam.kidsRoomId) {
      const kidRoom = rooms.find((r) => r.id === fam.kidsRoomId);
      if (kidRoom) {
        const filtered = (kidRoom.occupants || []).filter((occ) => !occ.startsWith(removed.name));
        await updateDoc(doc(db, "rooms", kidRoom.id), { occupants: filtered, updatedAt: Date.now() }).catch(() => {});
      }
    }
  };

  const toggleFamilyDeposit = async (fam) => {
    await saveFamilyDoc(fam, { depositPaid: !fam.depositPaid });
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
    await saveFamilyDoc(editingFamily, {
      coupleName,
      origin: (editingFamily.origin || "").trim(),
      adults
    });
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
    await saveFamilyDoc({
      id: newId,
      coupleName,
      origin: newFamOrigin.trim() || "Team Potes",
      adults,
      children: parsedKids,
      arrivalDate: "Sam. 26 Déc.",
      arrivalTime: "À préciser",
      departureDate: "Sam. 2 Janv.",
      departureTime: "À préciser",
      transport: "Voiture",
      adultRoomId: "",
      kidsRoomId: "",
      depositPaid: false
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

  // ==================== MEAL AGENDA (EMPTY BY DEFAULT) & MEAL IDEAS ACTIONS ====================
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
        menu: (editingMeal.menu || "").trim(),
        cooks: (editingMeal.cooks || "").trim(),
        notes: (editingMeal.notes || "").trim(),
        updatedAt: Date.now()
      },
      { merge: true }
    );
    mealDialogRef.current?.close();
  };

  const clearAllMealsAgenda = async () => {
    for (const m of INITIAL_MEALS) {
      await setDoc(doc(db, "meals", m.id), {
        day: m.day,
        slot: m.slot,
        menu: "",
        cooks: "",
        notes: "",
        updatedAt: Date.now()
      }).catch(() => {});
    }
    const resetIdeas = mealIdeas.map((idea) => ({ ...idea, assignedSlotId: "" }));
    setMealIdeas(resetIdeas);
    await setDoc(
      doc(db, "polls", "meal-ideas-board"),
      {
        title: "Propositions de Repas & Qui s'en occupe",
        options: resetIdeas,
        updatedAt: Date.now()
      },
      { merge: true }
    ).catch(() => {});
  };

  const clearSingleMealSlot = async (meal) => {
    await setDoc(
      doc(db, "meals", meal.id),
      {
        day: meal.day,
        slot: meal.slot,
        menu: "",
        cooks: "",
        notes: "",
        updatedAt: Date.now()
      },
      { merge: true }
    );
  };

  const saveMealIdeasList = async (nextList) => {
    setMealIdeas(nextList);
    await setDoc(
      doc(db, "polls", "meal-ideas-board"),
      {
        title: "Propositions de Repas & Qui s'en occupe",
        options: nextList,
        updatedAt: Date.now()
      },
      { merge: true }
    );
  };

  const handleAddMealIdea = async (e) => {
    e.preventDefault();
    const title = newMealIdeaTitle.trim();
    if (!title) return;
    const cooks = newMealIdeaCooks.trim() || userDisplayName;
    const newIdea = {
      id: `idea-${Date.now()}`,
      title,
      cooks,
      assignedSlotId: newMealIdeaSlotId || ""
    };
    const nextList = [...mealIdeas, newIdea];
    await saveMealIdeasList(nextList);

    if (newMealIdeaSlotId) {
      const slotMeal = meals.find((m) => m.id === newMealIdeaSlotId);
      if (slotMeal) {
        await setDoc(
          doc(db, "meals", slotMeal.id),
          {
            day: slotMeal.day,
            slot: slotMeal.slot,
            menu: title,
            cooks,
            updatedAt: Date.now()
          },
          { merge: true }
        );
      }
    }
    setNewMealIdeaTitle("");
    setNewMealIdeaCooks("");
    setNewMealIdeaSlotId("");
  };

  const updateMealIdeaCooks = async (ideaId, nextCooks) => {
    const nextList = mealIdeas.map((idea) =>
      idea.id === ideaId ? { ...idea, cooks: nextCooks } : idea
    );
    await saveMealIdeasList(nextList);

    const updatedIdea = nextList.find((i) => i.id === ideaId);
    if (updatedIdea?.assignedSlotId) {
      const slotMeal = meals.find((m) => m.id === updatedIdea.assignedSlotId);
      if (slotMeal) {
        await updateDoc(doc(db, "meals", slotMeal.id), {
          cooks: nextCooks,
          updatedAt: Date.now()
        }).catch(() => {});
      }
    }
  };

  const assignMealIdeaToSlot = async (idea, slotId) => {
    const prevSlotId = idea.assignedSlotId;
    const nextList = mealIdeas.map((i) =>
      i.id === idea.id ? { ...i, assignedSlotId: slotId } : i
    );
    await saveMealIdeasList(nextList);

    if (prevSlotId && prevSlotId !== slotId) {
      const prevMeal = meals.find((m) => m.id === prevSlotId);
      if (prevMeal && prevMeal.menu === idea.title) {
        await updateDoc(doc(db, "meals", prevMeal.id), {
          menu: "",
          cooks: "",
          updatedAt: Date.now()
        }).catch(() => {});
      }
    }

    if (slotId) {
      const targetMeal = meals.find((m) => m.id === slotId);
      if (targetMeal) {
        await setDoc(
          doc(db, "meals", targetMeal.id),
          {
            day: targetMeal.day,
            slot: targetMeal.slot,
            menu: idea.title,
            cooks: idea.cooks || "À définir",
            updatedAt: Date.now()
          },
          { merge: true }
        );
      }
    }
  };

  const deleteMealIdea = async (ideaId) => {
    const nextList = mealIdeas.filter((i) => i.id !== ideaId);
    await saveMealIdeasList(nextList);
  };

  // ==================== GROCERIES ACTIONS (WHO DOES WHAT & DONE STATUS) ====================
  const handleAddGrocery = async (e) => {
    e.preventDefault();
    const label = newGroceryLabel.trim();
    if (!label) return;
    await addDoc(collection(db, "groceries"), {
      label,
      category: newGroceryCategory,
      broughtBy: newGroceryWho.trim() || "À définir",
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

  const updateGroceryAssignee = async (item, newAssignee) => {
    await updateDoc(doc(db, "groceries", item.id), {
      broughtBy: newAssignee
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
      day: newActDay.trim() || "Autour du gîte",
      duration: "Libre",
      description: newActDesc.trim() || "Proposé pour le groupe !",
      imageUrl: newActImg.trim() || fallbackImg,
      websiteUrl: newActWebsiteUrl.trim() || "",
      websiteLabel: "Voir le site / Infos",
      proposedBy: userDisplayName,
      votes: [userDisplayName],
      votesHot: [userDisplayName],
      votesCold: [],
      createdAt: Date.now()
    });
    setNewActTitle("");
    setNewActDesc("");
    setNewActImg("");
    setNewActWebsiteUrl("");
    setNewActDay("");
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

  const syncAllActivities = async () => {
    for (const remId of REMOVED_HOME_ACTIVITY_IDS) {
      await deleteDoc(doc(db, "activities", remId)).catch(() => {});
    }
    for (const a of INITIAL_ACTIVITIES) {
      await setDoc(
        doc(db, "activities", a.id),
        {
          title: a.title,
          category: a.category,
          day: a.distanceFromGite || a.day,
          duration: a.duration,
          description: a.description,
          imageUrl: a.imageUrl,
          websiteUrl: a.websiteUrl || "",
          websiteLabel: a.websiteLabel || "Voir le site / Infos",
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
          <h2 className="font-display">Chargement du Gîte de Maleville…</h2>
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
              alt="Gîte Chez Aline & SPA Maleville"
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
                Chez Aline & SPA • Maleville (Aveyron)
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
              Chez Aline & SPA • 26 Déc. – 2 Janv.
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
                  <span className="badge badge-gold">🏡 {GITE_INFO.rating}</span>
                  <span className="badge badge-emerald">
                    👨‍👩‍👧‍👦 {totalAdultsCount} adultes & {totalKidsCount} enfants ({families.length} familles)
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
              <Car size={15} /> Arrivée au Gîte (Sam. 26 Déc. 16h)
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
          <Calendar size={17} /> Accueil & Agenda
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "rooms" ? "active" : ""}`}
          onClick={() => setActiveTab("rooms")}
        >
          <BedDouble size={17} /> Familles ({families.length}) & Chambres (10)
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "activities" ? "active" : ""}`}
          onClick={() => setActiveTab("activities")}
        >
          <Flame size={17} /> Activités ({activities.length}) & Carte
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

      {/* ==================== TAB 1: ACCUEIL, AGENDA DE LA SEMAINE & ARRIVÉES / DÉPARTS ==================== */}
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

          {/* AGENDA DE LA SEMAINE (SAM. 26 DÉC. -> SAM. 2 JANV.) */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.6rem", marginBottom: "1rem" }}>
              <div>
                <h2 style={{ fontSize: "1.22rem", fontWeight: 800 }}>
                  📅 Agenda de la Semaine (Sam. 26 Déc. → Sam. 2 Janv.)
                </h2>
                <p style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}>
                  Vue jour par jour des arrivées, départs et repas programmés par le groupe
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("meals")}
                className="btn btn-secondary"
                style={{ fontSize: "0.78rem", padding: "0.4rem 0.75rem" }}
              >
                <Utensils size={14} /> Gérer les repas
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(195px, 1fr))", gap: "0.75rem" }}>
              {STAY_DAYS.map((d) => {
                const arrivingFams = families.filter((f) => (f.arrivalDate || "Sam. 26 Déc.") === d.label);
                const departingFams = families.filter((f) => (f.departureDate || "Sam. 2 Janv.") === d.label);
                const dayMeals = meals.filter((m) => m.day === d.label && m.menu && m.menu.trim() !== "");
                const isNYE = d.id === "2026-12-31";

                return (
                  <div
                    key={d.id}
                    style={{
                      padding: "0.85rem",
                      borderRadius: "12px",
                      background: isNYE
                        ? "linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(15, 23, 42, 0.9))"
                        : "rgba(15, 23, 42, 0.65)",
                      border: isNYE ? "1px solid #f59e0b" : "1px solid var(--border-subtle)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.45rem"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className={`badge ${isNYE ? "badge-gold" : "badge-sky"}`}>{d.label}</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#f8fafc" }}>{d.subtitle}</div>

                    {arrivingFams.length > 0 && (
                      <div style={{ fontSize: "0.77rem", color: "#34d399", background: "rgba(16, 185, 129, 0.1)", padding: "0.35rem 0.5rem", borderRadius: "8px" }}>
                        🟢 <strong>Arrivées ({arrivingFams.length}) :</strong>{" "}
                        {arrivingFams
                          .map((f) => `${(f.adults || []).join("&")}${f.arrivalTime && f.arrivalTime !== "À préciser" ? ` (${f.arrivalTime})` : ""}`)
                          .join(", ")}
                      </div>
                    )}

                    {departingFams.length > 0 && (
                      <div style={{ fontSize: "0.77rem", color: "#fda4af", background: "rgba(244, 63, 94, 0.1)", padding: "0.35rem 0.5rem", borderRadius: "8px" }}>
                        🔴 <strong>Départs ({departingFams.length}) :</strong>{" "}
                        {departingFams
                          .map((f) => `${(f.adults || []).join("&")}${f.departureTime && f.departureTime !== "À préciser" ? ` (${f.departureTime})` : ""}`)
                          .join(", ")}
                      </div>
                    )}

                    {dayMeals.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "0.2rem" }}>
                        {dayMeals.map((m) => (
                          <div key={m.id} style={{ fontSize: "0.76rem", color: "#fde68a", background: "rgba(245, 158, 11, 0.12)", padding: "0.3rem 0.5rem", borderRadius: "6px" }}>
                            🍽️ <strong>{m.slot} :</strong> {m.menu} {m.cooks ? `(${m.cooks})` : ""}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: "0.75rem", color: "#64748b", fontStyle: "italic", marginTop: "auto" }}>
                        Repas libre / non défini
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* QUI ARRIVE QUAND & REPART QUAND (TABLEAU INTERACTIF DES 12 FAMILLES) */}
          <div className="card card-gold">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
              <div>
                <h2 style={{ fontSize: "1.22rem", fontWeight: 800 }}>
                  🚗 Arrivées & Départs : Qui arrive quand et repart quand ?
                </h2>
                <p style={{ fontSize: "0.84rem", color: "#cbd5e1" }}>
                  Modifie directement le jour et l'heure d'arrivée / de départ de ta famille ainsi que tes infos voiture / Drive (Villefranche est à 10 min) :
                </p>
              </div>
              <span className="badge badge-emerald">
                {families.length} Familles • {totalAdultsCount} adultes & {totalKidsCount} enfants
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {families.map((fam) => {
                const kids = Array.isArray(fam.children) ? fam.children : [];
                return (
                  <div
                    key={fam.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(200px, 1.3fr) minmax(210px, 1fr) minmax(210px, 1fr) minmax(170px, 0.9fr)",
                      gap: "0.6rem",
                      alignItems: "center",
                      padding: "0.75rem 0.9rem",
                      background: "rgba(15, 23, 42, 0.72)",
                      borderRadius: "12px",
                      border: "1px solid var(--border-subtle)"
                    }}
                  >
                    {/* Couple & Kids */}
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#fbbf24" }}>
                        💑 {(fam.adults || []).join(" & ") || fam.coupleName}
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "#94a3b8", display: "flex", gap: "0.35rem", flexWrap: "wrap", marginTop: "0.15rem" }}>
                        {fam.origin && <span>📍 {fam.origin}</span>}
                        {kids.length > 0 && (
                          <span style={{ color: "#7dd3fc" }}>
                            • 👶 {kids.map((k) => `${k.name}${k.age ? ` (${k.age})` : ""}`).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrivée (Jour + Heure) */}
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "#34d399", fontWeight: 700, marginBottom: "0.2rem" }}>
                        🟢 ARRIVÉE AU GÎTE
                      </div>
                      <div style={{ display: "flex", gap: "0.35rem" }}>
                        <select
                          className="select"
                          style={{ padding: "0.35rem 0.45rem", fontSize: "0.78rem", flex: 1 }}
                          value={fam.arrivalDate || "Sam. 26 Déc."}
                          onChange={(e) => updateFamilySchedule(fam, "arrivalDate", e.target.value)}
                        >
                          {STAY_DAYS.map((d) => (
                            <option key={d.id} value={d.label}>
                              {d.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          className="input"
                          style={{ padding: "0.35rem 0.5rem", fontSize: "0.78rem", width: "92px" }}
                          placeholder="Ex: 16h30"
                          value={fam.arrivalTime || ""}
                          onChange={(e) => updateFamilySchedule(fam, "arrivalTime", e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Départ (Jour + Heure) */}
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "#fda4af", fontWeight: 700, marginBottom: "0.2rem" }}>
                        🔴 DÉPART DU GÎTE
                      </div>
                      <div style={{ display: "flex", gap: "0.35rem" }}>
                        <select
                          className="select"
                          style={{ padding: "0.35rem 0.45rem", fontSize: "0.78rem", flex: 1 }}
                          value={fam.departureDate || "Sam. 2 Janv."}
                          onChange={(e) => updateFamilySchedule(fam, "departureDate", e.target.value)}
                        >
                          {STAY_DAYS.map((d) => (
                            <option key={d.id} value={d.label}>
                              {d.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          className="input"
                          style={{ padding: "0.35rem 0.5rem", fontSize: "0.78rem", width: "92px" }}
                          placeholder="Ex: 11h00"
                          value={fam.departureTime || ""}
                          onChange={(e) => updateFamilySchedule(fam, "departureTime", e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Transport / Drive note */}
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "#38bdf8", fontWeight: 700, marginBottom: "0.2rem" }}>
                        🚙 TRANSPORT / DRIVE
                      </div>
                      <input
                        type="text"
                        className="input"
                        style={{ padding: "0.35rem 0.55rem", fontSize: "0.78rem" }}
                        placeholder="Voiture, dispo Drive..."
                        value={fam.transport || ""}
                        onChange={(e) => updateFamilySchedule(fam, "transport", e.target.value)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* GITE SUMMARY & PHOTO TOUR */}
          <div className="grid-2">
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>🏡 Notre Gîte « Chez Aline & SPA » en bref</h3>
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
                Grande demeure du XVIIIe siècle sur 3 étages privatisée pour notre groupe du{" "}
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

            {/* Photo Tour of the Gite */}
            <div className="card">
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.85rem" }}>
                ✨ Aperçu des espaces de la Maison
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))", gap: "0.75rem" }}>
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
                      style={{ width: "100%", height: "115px", objectFit: "cover", display: "block" }}
                    />
                    <div style={{ padding: "0.45rem 0.6rem", fontSize: "0.76rem", fontWeight: 600 }}>
                      {p.caption}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: FAMILLES (LES 12 COUPLES + ENFANTS) & 10 CHAMBRES ==================== */}
      {activeTab === "rooms" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* SECTION 1: LES 12 FAMILLES (COUPLES + ENFANTS) */}
          <div className="card card-gold">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1rem" }}>
              <div>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 800 }}>
                  👨‍👩‍👧‍👦 Toutes les Familles ({families.length} familles • {totalAdultsCount} adultes & {totalKidsCount} enfants)
                </h2>
                <p style={{ fontSize: "0.86rem", color: "#cbd5e1" }}>
                  Toutes les familles du groupe sont listées ci-dessous. Choisissez directement la <strong>chambre des parents</strong> et la <strong>chambre des enfants</strong> dans les menus déroulants : les 10 chambres se mettent à jour toutes seules !
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
                          title="Modifier les prénoms du couple"
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
                placeholder="Adulte 1"
                value={newFamAdult1}
                onChange={(e) => setNewFamAdult1(e.target.value)}
                required
              />
              <input
                type="text"
                className="input"
                placeholder="Adulte 2"
                value={newFamAdult2}
                onChange={(e) => setNewFamAdult2(e.target.value)}
              />
              <input
                type="text"
                className="input"
                placeholder="Enfants (ex: Léo 5a)"
                value={newFamKidsText}
                onChange={(e) => setNewFamKidsText(e.target.value)}
              />
              <input
                type="text"
                className="input"
                placeholder="Ville / Team"
                value={newFamOrigin}
                onChange={(e) => setNewFamOrigin(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">
                <Plus size={16} /> Ajouter une Famille
              </button>
            </form>
          </div>

          {/* SECTION 2: LES 10 CHAMBRES DU GÎTE */}
          <div className="card">
            <h2 style={{ fontSize: "1.22rem", fontWeight: 800, marginBottom: "0.3rem" }}>
              🛏️ Vue des 10 Chambres du Gîte
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

      {/* ==================== TAB 3: ACTIVITÉS AUTOUR DU GÎTE & CARTE INTERACTIVE ==================== */}
      {activeTab === "activities" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="card card-gold">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.85rem" }}>
              <div>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "0.25rem" }}>
                  🔥 Activités & Sorties autour de Maleville : Chaud ou Pas Chaud ?
                </h2>
                <p style={{ fontSize: "0.86rem", color: "#cbd5e1" }}>
                  Spéléo à 13°C, VTT / VTT électrique, Via Ferrata & tyrolienne, trail, cheval/poney, tir à l'arc, randos, cités médiévales, vignobles de Marcillac & grands crus : chaque carte indique la <strong>distance depuis notre gîte</strong>, le lien du site et une carte interactive se trouve juste en dessous !
                </p>
              </div>
              <button
                type="button"
                onClick={syncAllActivities}
                className="btn btn-secondary"
                style={{ fontSize: "0.78rem", padding: "0.42rem 0.75rem" }}
                title="Synchroniser les activités extérieures et nettoyer les anciennes activités maison"
              >
                <RefreshCw size={14} /> Synchroniser les activités ({INITIAL_ACTIVITIES.length})
              </button>
            </div>

            {/* Category filter pills (without at-home activities) */}
            <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              {[
                "Toutes",
                "Sport & Aventure",
                "Rando & Nature",
                "Visite & Patrimoine",
                "Terroir & Gastronomie"
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
                placeholder="Titre de l'activité *"
                value={newActTitle}
                onChange={(e) => setNewActTitle(e.target.value)}
                required
              />
              <select className="select" value={newActCat} onChange={(e) => setNewActCat(e.target.value)}>
                <option value="Sport & Aventure">🏇 Sport & Aventure</option>
                <option value="Rando & Nature">🥾 Rando & Nature</option>
                <option value="Visite & Patrimoine">🏰 Visite & Patrimoine</option>
                <option value="Terroir & Gastronomie">🍷 Terroir & Gastronomie</option>
              </select>
              <input
                type="text"
                className="input"
                placeholder="Distance du gîte (ex: 15 km • 20 min)"
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
              <input
                type="url"
                className="input"
                placeholder="Lien du site web (https://...)"
                value={newActWebsiteUrl}
                onChange={(e) => setNewActWebsiteUrl(e.target.value)}
              />
              <input
                type="url"
                className="input"
                placeholder="Lien image de fond (optionnel)"
                value={newActImg}
                onChange={(e) => setNewActImg(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">
                <Plus size={16} /> Proposer
              </button>
            </form>
          </div>

          {/* Grid of Activity Cards — ONLY Typology Badge + Distance from Gîte */}
          <div className="grid-2">
            {filteredActivities.map((act) => {
              const hotVotes = Array.isArray(act.votesHot) ? act.votesHot : Array.isArray(act.votes) ? act.votes : [];
              const coldVotes = Array.isArray(act.votesCold) ? act.votesCold : [];
              const iVotedHot = hotVotes.includes(userDisplayName);
              const iVotedCold = coldVotes.includes(userDisplayName);
              const bgImg = act.imageUrl || DEFAULT_CATEGORY_IMAGES[act.category] || DEFAULT_CATEGORY_IMAGES["Sport & Aventure"];
              const distLabel = act.distanceFromGite || act.day || "Autour de Maleville";

              return (
                <div
                  key={act.id}
                  className="activity-bg-card"
                  style={{ backgroundImage: `url("${bgImg}")` }}
                >
                  <div className="activity-bg-overlay">
                    {/* ONLY the activity typology badge as requested */}
                    <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "flex-start" }}>
                      <span className="badge badge-gold" style={{ background: "rgba(15, 23, 42, 0.88)", backdropFilter: "blur(6px)" }}>
                        {act.category}
                      </span>
                    </div>

                    {/* Content, Distance from Gîte, Website Link & Votes at bottom */}
                    <div style={{ marginTop: "auto" }}>
                      <h3 style={{ fontSize: "1.12rem", fontWeight: 800, marginBottom: "0.25rem", textShadow: "0 2px 6px rgba(0,0,0,0.85)" }}>
                        {act.title}
                      </h3>

                      {/* Distance from our lodging */}
                      <div style={{ fontSize: "0.82rem", color: "#38bdf8", fontWeight: 700, marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <Car size={15} /> Distance du gîte : {distLabel}
                      </div>

                      <p style={{ fontSize: "0.84rem", color: "#e2e8f0", marginBottom: "0.7rem", lineHeight: 1.45 }}>
                        {act.description}
                      </p>

                      {/* Official Website Link Button */}
                      {act.websiteUrl && (
                        <div style={{ marginBottom: "0.7rem" }}>
                          <a
                            href={act.websiteUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary"
                            style={{
                              padding: "0.36rem 0.75rem",
                              fontSize: "0.78rem",
                              background: "rgba(15, 23, 42, 0.82)",
                              borderColor: "rgba(56, 189, 248, 0.45)",
                              color: "#7dd3fc"
                            }}
                          >
                            🌐 {act.websiteLabel || "Voir le site / Infos"} <ExternalLink size={13} />
                          </a>
                        </div>
                      )}

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

          {/* INTERACTIVE LEAFLET MAP BELOW ACTIVITIES */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.85rem" }}>
              <div>
                <h3 style={{ fontSize: "1.18rem", fontWeight: 800 }}>
                  🗺️ Carte Interactive des Activités autour de Notre Gîte (Maleville)
                </h3>
                <p style={{ fontSize: "0.83rem", color: "var(--text-muted)" }}>
                  Le marqueur doré <strong>🏡</strong> indique notre gîte à Maleville. Clique sur n'importe quel point pour voir l'activité, sa distance exacte et son site web :
                </p>
              </div>
              <span className="badge badge-sky">
                {filteredActivities.filter((a) => typeof a.lat === "number").length} lieux géolocalisés
              </span>
            </div>

            <ActivitiesMap activities={filteredActivities} />
          </div>
        </div>
      )}

      {/* ==================== TAB 4: REPAS (AGENDA VIDE + PROPOSITIONS) & COURSES (QUI FAIT QUOI / FAIT) ==================== */}
      {activeTab === "meals" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Section A: Empty Meal Agenda (7 days Midi & Soir) */}
          <div className="card card-gold">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1rem" }}>
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>
                  📅 Agenda des Repas de la Semaine (26 Déc. → 2 Janv.)
                </h2>
                <p style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>
                  L'agenda est volontairement vierge au départ : affectez une proposition de repas ci-dessous sur un créneau ou cliquez sur <strong>« Remplir / Modifier »</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={clearAllMealsAgenda}
                className="btn btn-secondary"
                style={{ fontSize: "0.78rem", padding: "0.42rem 0.75rem" }}
                title="Remettre tous les créneaux de l'agenda à vide"
              >
                <RefreshCw size={14} /> Vider tout l'agenda
              </button>
            </div>

            <div className="grid-2">
              {meals.map((meal) => {
                const isNYE = meal.id.includes("12-31-soir");
                const isEmpty = !meal.menu || meal.menu.trim() === "";
                return (
                  <div
                    key={meal.id}
                    style={{
                      padding: "0.95rem",
                      borderRadius: "14px",
                      background: isNYE
                        ? "linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(15, 23, 42, 0.9))"
                        : isEmpty
                        ? "rgba(15, 23, 42, 0.45)"
                        : "rgba(15, 23, 42, 0.78)",
                      border: isNYE
                        ? "1px solid #f59e0b"
                        : isEmpty
                        ? "1px dashed rgba(148, 163, 184, 0.35)"
                        : "1px solid rgba(16, 185, 129, 0.4)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "0.55rem"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem", gap: "0.4rem" }}>
                        <span className={`badge ${isNYE ? "badge-gold" : "badge-sky"}`}>
                          {meal.day} • {meal.slot}
                        </span>
                        <div style={{ display: "flex", gap: "0.35rem" }}>
                          <button
                            type="button"
                            onClick={() => openMealEditor(meal)}
                            className="btn btn-secondary"
                            style={{ padding: "0.25rem 0.55rem", fontSize: "0.75rem" }}
                          >
                            <Edit3 size={12} /> {isEmpty ? "Remplir" : "Modifier"}
                          </button>
                          {!isEmpty && (
                            <button
                              type="button"
                              onClick={() => clearSingleMealSlot(meal)}
                              className="btn btn-danger"
                              style={{ padding: "0.25rem 0.45rem", fontSize: "0.75rem" }}
                              title="Vider ce créneau"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>

                      {isEmpty ? (
                        <div style={{ fontSize: "0.86rem", color: "#64748b", fontStyle: "italic", padding: "0.25rem 0" }}>
                          — Créneau libre (choisir une proposition ci-dessous) —
                        </div>
                      ) : (
                        <>
                          <div style={{ fontWeight: 700, fontSize: "0.96rem", color: "#f8fafc", marginBottom: "0.25rem" }}>
                            🍽️ {meal.menu}
                          </div>
                          <div style={{ fontSize: "0.82rem", color: "#34d399", fontWeight: 600 }}>
                            👨‍🍳 Qui s'en occupe : <strong>{meal.cooks || "À définir"}</strong>
                          </div>
                          {meal.notes && (
                            <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                              💡 {meal.notes}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section B: Meal Possibilities & Proposals Board (Below the Empty Agenda) */}
          <div className="card">
            <div style={{ marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1.22rem", fontWeight: 800 }}>
                💡 Possibilités & Propositions de Repas (Qui s'en occupe ?)
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Ajoute des idées de repas, indique <strong>qui s'en occupe</strong> et place-les quand vous voulez dans l'agenda ci-dessus :
              </p>
            </div>

            {/* Form to add a new meal proposal */}
            <form
              onSubmit={handleAddMealIdea}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: "0.6rem",
                marginBottom: "1.15rem",
                padding: "0.9rem",
                background: "rgba(15, 23, 42, 0.65)",
                borderRadius: "12px",
                border: "1px solid var(--border-subtle)"
              }}
            >
              <input
                type="text"
                className="input"
                placeholder="Idée de repas (ex: Raclette, Aligot, Burgers...)"
                value={newMealIdeaTitle}
                onChange={(e) => setNewMealIdeaTitle(e.target.value)}
                required
              />
              <input
                type="text"
                className="input"
                placeholder={`Qui s'en occupe ? (ex: ${userDisplayName})`}
                value={newMealIdeaCooks}
                onChange={(e) => setNewMealIdeaCooks(e.target.value)}
              />
              <select
                className="select"
                value={newMealIdeaSlotId}
                onChange={(e) => setNewMealIdeaSlotId(e.target.value)}
              >
                <option value="">-- Créneau agenda (optionnel) --</option>
                {meals.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.day} ({m.slot})
                  </option>
                ))}
              </select>
              <button type="submit" className="btn btn-primary">
                <Plus size={16} /> Ajouter la proposition
              </button>
            </form>

            {/* List of meal ideas */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {mealIdeas.map((idea) => (
                <div
                  key={idea.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(220px, 1.5fr) minmax(190px, 1fr) minmax(190px, 1fr) auto",
                    gap: "0.65rem",
                    alignItems: "center",
                    padding: "0.75rem 0.9rem",
                    borderRadius: "12px",
                    background: idea.assignedSlotId ? "rgba(16, 185, 129, 0.1)" : "rgba(15, 23, 42, 0.65)",
                    border: idea.assignedSlotId ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid var(--border-subtle)"
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.94rem", color: "#f8fafc" }}>
                      🍲 {idea.title}
                    </div>
                    {idea.assignedSlotId && (
                      <span className="badge badge-emerald" style={{ marginTop: "0.25rem" }}>
                        ✅ Placé dans l'agenda
                      </span>
                    )}
                  </div>

                  {/* Who is in charge */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.7rem", color: "#fbbf24", fontWeight: 700, marginBottom: "0.18rem" }}>
                      👨‍🍳 QUI S'EN OCCUPE :
                    </label>
                    <input
                      type="text"
                      className="input"
                      style={{ padding: "0.36rem 0.55rem", fontSize: "0.8rem" }}
                      placeholder="Prénom(s) ou couple..."
                      value={idea.cooks || ""}
                      onChange={(e) => updateMealIdeaCooks(idea.id, e.target.value)}
                    />
                  </div>

                  {/* Assign to agenda slot */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.7rem", color: "#38bdf8", fontWeight: 700, marginBottom: "0.18rem" }}>
                      📅 PLACER SUR UN JOUR :
                    </label>
                    <select
                      className="select"
                      style={{ padding: "0.36rem 0.55rem", fontSize: "0.8rem" }}
                      value={idea.assignedSlotId || ""}
                      onChange={(e) => assignMealIdeaToSlot(idea, e.target.value)}
                    >
                      <option value="">-- Non planifié --</option>
                      {meals.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.day} • {m.slot}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteMealIdea(idea.id)}
                    className="btn btn-danger"
                    style={{ padding: "0.4rem 0.55rem" }}
                    title="Supprimer cette proposition"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section C: Groceries & Who Does What + Done Status */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1rem" }}>
              <div>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 800 }}>
                  🛒 Liste de Courses : Qui s'en occupe & Statut (Fait / À faire)
                </h2>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Affecte qui s'occupe de chaque produit et coche <strong>« Fait ✅ »</strong> dès que c'est acheté ou dans le coffre :
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
                placeholder="Produit à acheter / ramener..."
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
              <select
                className="select"
                value={newGroceryWho}
                onChange={(e) => setNewGroceryWho(e.target.value)}
              >
                <option value="">-- Qui s'en occupe ? (À définir) --</option>
                {allAssigneesList.map((person) => (
                  <option key={person} value={person}>
                    {person}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn btn-primary">
                <Plus size={16} /> Ajouter à la liste
              </button>
            </form>

            {/* Grocery Items List with interactive assignee & explicit Done toggle */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
              {filteredGroceries.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(220px, 1.6fr) minmax(190px, 1fr) auto auto",
                    alignItems: "center",
                    gap: "0.65rem",
                    padding: "0.7rem 0.9rem",
                    borderRadius: "12px",
                    background: item.checked ? "rgba(16, 185, 129, 0.08)" : "rgba(15, 23, 42, 0.72)",
                    border: item.checked ? "1px solid rgba(16, 185, 129, 0.35)" : "1px solid var(--border-subtle)"
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      cursor: "pointer"
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
                          textDecoration: item.checked ? "line-through" : "none",
                          color: item.checked ? "#94a3b8" : "#f8fafc"
                        }}
                      >
                        {item.label}
                      </div>
                      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.2rem" }}>
                        <span className="badge badge-gold">{item.category}</span>
                      </div>
                    </div>
                  </label>

                  {/* Interactive Who is in charge selector */}
                  <div>
                    <div style={{ fontSize: "0.68rem", color: "#38bdf8", fontWeight: 700, marginBottom: "0.15rem" }}>
                      👤 QUI S'EN OCCUPE :
                    </div>
                    <select
                      className="select"
                      style={{ padding: "0.34rem 0.5rem", fontSize: "0.79rem" }}
                      value={item.broughtBy || "À définir"}
                      onChange={(e) => updateGroceryAssignee(item, e.target.value)}
                    >
                      {!allAssigneesList.includes(item.broughtBy || "À définir") && (
                        <option value={item.broughtBy}>{item.broughtBy}</option>
                      )}
                      {allAssigneesList.map((person) => (
                        <option key={person} value={person}>
                          {person}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Explicit Status Button (Fait / À faire) */}
                  <button
                    type="button"
                    onClick={() => toggleGroceryChecked(item)}
                    className={`btn ${item.checked ? "btn-primary" : "btn-secondary"}`}
                    style={{
                      padding: "0.38rem 0.7rem",
                      fontSize: "0.78rem",
                      background: item.checked ? "#10b981" : undefined,
                      color: item.checked ? "#052e16" : undefined
                    }}
                  >
                    {item.checked ? "✅ Fait" : "⏳ À faire"}
                  </button>

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

      {/* ==================== TAB 5: GOOGLE PHOTOS (APERÇU GALERIE + LIENS 2027 & 2026) ==================== */}
      {activeTab === "photos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="grid-2">
            {/* Album Officiel Nouvel An 2027 */}
            <div className="card card-gold" style={{ textAlign: "center", padding: "1.6rem 1.25rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <span className="badge badge-gold" style={{ marginBottom: "0.6rem" }}>
                  ✨ ALBUM OFFICIEL DU SÉJOUR
                </span>
                <h2 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: "0.45rem" }}>
                  📸 Google Photos • Nouvel An 2027
                </h2>
                <p style={{ fontSize: "0.86rem", color: "#cbd5e1", marginBottom: "1.1rem" }}>
                  L'album partagé 2027 est prêt (encore vierge en attendant le 26 décembre). Ajoutez vos photos dès le départ !
                </p>
              </div>
              <a
                href={links.googlePhotosUrl || GITE_INFO.googlePhotosUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-photos"
                style={{ padding: "0.85rem 1.4rem", fontSize: "0.95rem" }}
              >
                <Camera size={20} /> Ouvrir / Ajouter des photos dans l'Album 2027 <ExternalLink size={16} />
              </a>
            </div>

            {/* Album Souvenirs Nouvel An 2026 */}
            <div className="card" style={{ textAlign: "center", padding: "1.6rem 1.25rem", borderColor: "rgba(56, 189, 248, 0.4)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <span className="badge badge-sky" style={{ marginBottom: "0.6rem" }}>
                  🎞️ 198 PHOTOS & VIDÉOS DE L'AN DERNIER
                </span>
                <h2 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: "0.45rem" }}>
                  🥂 Souvenirs • Nouvel An 2026
                </h2>
                <p style={{ fontSize: "0.86rem", color: "#cbd5e1", marginBottom: "1.1rem" }}>
                  Retrouvez l'aperçu des photos de l'album 2026 juste en dessous ou ouvrez la galerie complète sur Google Photos :
                </p>
              </div>
              <a
                href={GITE_INFO.googlePhotos2026Url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ padding: "0.85rem 1.4rem", fontSize: "0.95rem", borderColor: "#38bdf8", color: "#7dd3fc" }}
              >
                <Sparkles size={19} /> Ouvrir les 198 photos de l'Album 2026 <ExternalLink size={16} />
              </a>
            </div>
          </div>

          {/* LIVE PHOTO PREVIEW GALLERY FROM GOOGLE PHOTOS */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.9rem" }}>
              <div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 800 }}>
                  🖼️ Aperçu Direct des Photos de l'Album Google Photos (Édition 2026 • 198 photos)
                </h3>
                <p style={{ fontSize: "0.83rem", color: "var(--text-muted)" }}>
                  Clique sur n'importe quelle miniature pour ouvrir l'album Google Photos complet :
                </p>
              </div>
              <a
                href={GITE_INFO.googlePhotos2026Url}
                target="_blank"
                rel="noreferrer"
                className="badge badge-sky"
                style={{ textDecoration: "none", padding: "0.35rem 0.75rem" }}
              >
                Voir les 198 photos <ExternalLink size={12} />
              </a>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))",
                gap: "0.65rem"
              }}
            >
              {GOOGLE_PHOTOS_2026_PREVIEWS.map((imgUrl, idx) => (
                <a
                  key={idx}
                  href={GITE_INFO.googlePhotos2026Url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "block",
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: "1px solid var(--border-subtle)",
                    background: "#0f172a",
                    position: "relative",
                    aspectRatio: "4 / 3"
                  }}
                  title="Ouvrir dans Google Photos"
                >
                  <img
                    src={imgUrl}
                    alt={`Souvenir Nouvel An #${idx + 1}`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                      transition: "transform 0.25s ease"
                    }}
                  />
                </a>
              ))}
            </div>
          </div>

          {/* Optional pinned highlights or sub-links */}
          <div className="card">
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.4rem" }}>
              🌟 Épingler une Photo coup de cœur ou un Lien Vidéo (2027)
            </h3>
            <p style={{ fontSize: "0.83rem", color: "var(--text-muted)", marginBottom: "0.9rem" }}>
              Colle le lien d'une photo ou d'un sous-album pour l'afficher ici :
            </p>

            <form
              onSubmit={handleAddPhotoHighlight}
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.6rem", marginBottom: "1rem" }}
            >
              <input
                type="text"
                className="input"
                placeholder="Titre (ex: Photo de groupe, Montage vidéo...)"
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
                <Plus size={16} /> Épingler
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
              🍽️ Programmer : {editingMeal.day} ({editingMeal.slot})
            </h3>

            <div>
              <label style={{ display: "block", fontSize: "0.82rem", marginBottom: "0.25rem" }}>
                Menu prévu (laisser vide pour libérer le créneau)
              </label>
              <input
                type="text"
                className="input"
                placeholder="Ex: Aligot-Saucisse, Raclette, Burgers..."
                value={editingMeal.menu || ""}
                onChange={(e) => setEditingMeal({ ...editingMeal, menu: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.82rem", marginBottom: "0.25rem" }}>
                Qui s'en occupe / cuisine ce repas ?
              </label>
              <input
                type="text"
                className="input"
                placeholder="Ex: Baptiste & Lulu, Team Dijon..."
                value={editingMeal.cooks || ""}
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
                Enregistrer le créneau
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


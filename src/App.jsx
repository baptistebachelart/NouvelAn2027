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
  ShoppingCart,
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
  ThumbsUp,
  ExternalLink,
  Users,
  Clock,
  Car,
  Music,
  Wallet,
  Settings,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Phone,
  Home,
  Edit3
} from "lucide-react";
import { auth, db } from "./firebase";
import {
  GITE_INFO,
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
    googlePhotosUrl: "",
    tricountUrl: "",
    playlistUrl: ""
  });
  const [rooms, setRooms] = useState(INITIAL_ROOMS);
  const [meals, setMeals] = useState(INITIAL_MEALS);
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
  const [linksDraft, setLinksDraft] = useState({
    whatsappUrl: "",
    googlePhotosUrl: "",
    tricountUrl: "",
    playlistUrl: ""
  });

  const [editingMeal, setEditingMeal] = useState(null);
  const [newGroceryLabel, setNewGroceryLabel] = useState("");
  const [newGroceryCategory, setNewGroceryCategory] = useState("Spécialités Régionales");
  const [newGroceryWho, setNewGroceryWho] = useState("");
  const [groceryFilter, setGroceryFilter] = useState("Toutes");

  const [newActTitle, setNewActTitle] = useState("");
  const [newActCat, setNewActCat] = useState("Sur place (Gîte)");
  const [newActDay, setNewActDay] = useState("En semaine");
  const [newActDesc, setNewActDesc] = useState("");

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

  // Native <dialog closedby="any"> fallback for browsers without declarative closedBy support (modern-web-guidance: light-dismiss-a-dialog)
  useEffect(() => {
    const dialogs = [linksDialogRef.current, mealDialogRef.current].filter(Boolean);
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

  // Firestore real-time subscriptions + automatic initial seed if empty
  useEffect(() => {
    if (!user) return;

    // 1. Settings / Links
    const unsubSettings = onSnapshot(
      doc(db, "settings", "global"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setLinks({
            whatsappUrl: data.whatsappUrl || "",
            googlePhotosUrl: data.googlePhotosUrl || "",
            tricountUrl: data.tricountUrl || "",
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
        const me = list.find((m) => m.id === user.uid);
        if (me) {
          setMyArrivalTime((prev) => prev || me.arrivalTime || "");
          setMyTransport((prev) => prev || me.transport || "");
        }
      },
      (err) => console.warn("Users listener warning:", err.message)
    );

    // 3. Rooms
    const unsubRooms = onSnapshot(
      collection(db, "rooms"),
      async (snap) => {
        if (snap.empty) {
          for (const r of INITIAL_ROOMS) {
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
        } else {
          const loaded = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          loaded.sort((a, b) => a.id.localeCompare(b.id));
          setRooms(loaded);
        }
      },
      (err) => console.warn("Rooms listener warning:", err.message)
    );

    // 4. Meals
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

    // 5. Groceries
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

    // 6. Activities
    const unsubActivities = onSnapshot(
      collection(db, "activities"),
      async (snap) => {
        if (snap.empty) {
          for (const a of INITIAL_ACTIVITIES) {
            await setDoc(doc(db, "activities", a.id), {
              title: a.title,
              category: a.category,
              day: a.day,
              duration: a.duration,
              description: a.description,
              proposedBy: a.proposedBy,
              votes: a.votes,
              createdAt: Date.now()
            }).catch(() => {});
          }
        } else {
          const loaded = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          loaded.sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0));
          setActivities(loaded);
        }
      },
      (err) => console.warn("Activities listener warning:", err.message)
    );

    // 7. Photo highlights
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
      unsubRooms();
      unsubMeals();
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
        setAuthError("Email ou mot de passe incorrect. Si c'est ta première visite, clique sur « Créer mon compte ».");
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

  // Save shared links (WhatsApp, Google Photos, Tricount, Playlist)
  const openLinksModal = () => {
    setLinksDraft(links);
    linksDialogRef.current?.showModal();
  };

  const saveSharedLinks = async (e) => {
    e.preventDefault();
    await setDoc(
      doc(db, "settings", "global"),
      {
        whatsappUrl: linksDraft.whatsappUrl.trim(),
        googlePhotosUrl: linksDraft.googlePhotosUrl.trim(),
        tricountUrl: linksDraft.tricountUrl.trim(),
        playlistUrl: linksDraft.playlistUrl.trim(),
        updatedBy: userDisplayName,
        updatedAt: Date.now()
      },
      { merge: true }
    );
    linksDialogRef.current?.close();
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

  // Room actions
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

  // Activities actions
  const handleAddActivity = async (e) => {
    e.preventDefault();
    const title = newActTitle.trim();
    if (!title) return;
    await addDoc(collection(db, "activities"), {
      title,
      category: newActCat,
      day: newActDay.trim() || "À caler",
      duration: "Libre",
      description: newActDesc.trim() || "Proposé pour le groupe !",
      proposedBy: userDisplayName,
      votes: [userDisplayName],
      createdAt: Date.now()
    });
    setNewActTitle("");
    setNewActDesc("");
  };

  const toggleActivityVote = async (act) => {
    const currentVotes = Array.isArray(act.votes) ? act.votes : [];
    const hasVoted = currentVotes.includes(userDisplayName);
    const nextVotes = hasVoted
      ? currentVotes.filter((v) => v !== userDisplayName)
      : [...currentVotes, userDisplayName];
    await updateDoc(doc(db, "activities", act.id), {
      votes: nextVotes
    });
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
                  placeholder="Ex: Baptiste, Ludivine, Thomas..."
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
                    <option value="Lyon">Team Lyon</option>
                    <option value="Valence">Team Valence</option>
                    <option value="Nice">Team Nice</option>
                    <option value="Cherbourg">Team Cherbourg</option>
                    <option value="Paris">Team Paris</option>
                    <option value="Savoie">Team Savoie</option>
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
                  <span className="badge badge-emerald">👨‍👩‍👧‍👦 12 adultes & 6 enfants</span>
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
          <Home size={17} /> Accueil & Tribu
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
          className={`tab-btn ${activeTab === "rooms" ? "active" : ""}`}
          onClick={() => setActiveTab("rooms")}
        >
          <BedDouble size={17} /> Chambres (9)
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "activities" ? "active" : ""}`}
          onClick={() => setActiveTab("activities")}
        >
          <Calendar size={17} /> Programme & Activités
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "photos" ? "active" : ""}`}
          onClick={() => setActiveTab("photos")}
        >
          <Camera size={17} /> Google Photos
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "info" ? "active" : ""}`}
          onClick={() => setActiveTab("info")}
        >
          <Info size={17} /> Infos Pratiques
        </button>
      </nav>

      {/* ==================== TAB 1: ACCUEIL & TRIBU ==================== */}
      {activeTab === "home" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Quick Actions Strip */}
          <div className="card card-gold">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 700 }}>⚡ Raccourcis du Groupe</h2>
                <p style={{ fontSize: "0.83rem", color: "var(--text-muted)" }}>
                  WhatsApp, Album Google Photos, GPS, Wi-Fi et Tricount en un clic
                </p>
              </div>
              <button type="button" onClick={openLinksModal} className="btn btn-secondary">
                <Settings size={15} /> Configurer les liens
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
              {links.whatsappUrl ? (
                <a href={links.whatsappUrl} target="_blank" rel="noreferrer" className="btn btn-whatsapp">
                  <MessageCircle size={18} /> Groupe WhatsApp
                </a>
              ) : (
                <button type="button" onClick={openLinksModal} className="btn btn-whatsapp">
                  <MessageCircle size={18} /> + Lier le WhatsApp
                </button>
              )}

              {links.googlePhotosUrl ? (
                <a href={links.googlePhotosUrl} target="_blank" rel="noreferrer" className="btn btn-photos">
                  <Camera size={18} /> Album Google Photos
                </a>
              ) : (
                <button type="button" onClick={() => setActiveTab("photos")} className="btn btn-photos">
                  <Camera size={18} /> Album Google Photos
                </button>
              )}

              <a href={GITE_INFO.mapsUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
                <MapPin size={17} color="#f59e0b" /> GPS (Maleville 12350)
              </a>

              <button type="button" onClick={copyWifiCode} className="btn btn-secondary">
                {copiedWifi ? <Check size={17} color="#10b981" /> : <Wifi size={17} color="#38bdf8" />}
                {copiedWifi ? "Code Wi-Fi copié !" : `Wi-Fi : ${GITE_INFO.wifi.code}`}
              </button>

              {links.tricountUrl && (
                <a href={links.tricountUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
                  <Wallet size={17} color="#10b981" /> Tricount / Comptes
                </a>
              )}

              {links.playlistUrl && (
                <a href={links.playlistUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
                  <Music size={17} color="#f43f5e" /> Playlist Réveillon
                </a>
              )}
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

      {/* ==================== TAB 2: REPAS & COURSES ==================== */}
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

      {/* ==================== TAB 3: CHAMBRES (9 CHAMBRES) ==================== */}
      {activeTab === "rooms" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="card card-gold">
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>
              🛏️ Répartition des Chambres du Château
            </h2>
            <p style={{ fontSize: "0.86rem", color: "#cbd5e1" }}>
              Le contrat prévoit <strong>6 chambres doubles adultes</strong> et <strong>3 espaces/chambres enfants</strong> (draps et serviettes de toilette fournis dans chaque chambre). Clique sur <strong>« + M'ajouter »</strong> ou inscris le prénom des enfants !
            </p>
          </div>

          <div className="grid-3">
            {rooms.map((room) => {
              const occupants = Array.isArray(room.occupants) ? room.occupants : [];
              const isKids = room.type === "kids";
              return (
                <div key={room.id} className="card room-card">
                  {room.photoUrl && (
                    <div className="room-img-wrap">
                      <img src={room.photoUrl} alt={room.name} loading="lazy" />
                      <span
                        className={`badge ${isKids ? "badge-sky" : "badge-gold"}`}
                        style={{ position: "absolute", top: 10, left: 10, background: "rgba(15, 23, 42, 0.85)" }}
                      >
                        {isKids ? "🧸 Espace Enfants" : "👑 Chambre Double Adulte"}
                      </span>
                    </div>
                  )}

                  <div className="room-body">
                    <div>
                      <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>{room.name}</h3>
                      <div style={{ fontSize: "0.8rem", color: "#fbbf24", fontWeight: 600 }}>
                        {room.capacityLabel || `${room.capacity} places`} • {room.floor}
                      </div>
                      <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                        {room.description}
                      </p>
                    </div>

                    {/* Current occupants */}
                    <div
                      style={{
                        background: "rgba(15, 23, 42, 0.6)",
                        borderRadius: "10px",
                        padding: "0.65rem",
                        border: "1px solid var(--border-subtle)"
                      }}
                    >
                      <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                        Occupants inscrits ({occupants.length}) :
                      </div>
                      {occupants.length === 0 ? (
                        <div style={{ fontSize: "0.82rem", color: "#64748b", fontStyle: "italic" }}>
                          Chambre libre — personne d'inscrit
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                          {occupants.map((occ) => (
                            <span
                              key={occ}
                              className="badge badge-emerald"
                              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.3rem 0.6rem" }}
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
                                  marginLeft: "0.2rem"
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

                    {/* Add myself or custom name */}
                    <div style={{ display: "flex", gap: "0.4rem", marginTop: "auto" }}>
                      <input
                        type="text"
                        className="input"
                        style={{ padding: "0.45rem 0.65rem", fontSize: "0.83rem" }}
                        placeholder="Prénom(s) à ajouter..."
                        value={newOccupantByRoom[room.id] || ""}
                        onChange={(e) =>
                          setNewOccupantByRoom((prev) => ({ ...prev, [room.id]: e.target.value }))
                        }
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: "0.45rem 0.7rem", fontSize: "0.8rem", whiteSpace: "nowrap" }}
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
      )}

      {/* ==================== TAB 4: PROGRAMME & ACTIVITÉS ==================== */}
      {activeTab === "activities" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="card card-gold">
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "0.3rem" }}>
              🎯 Programme & Propositions d'Activités
            </h2>
            <p style={{ fontSize: "0.86rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              Vote pour les sorties et animations qui te chauffent ou propose une nouvelle idée pour la semaine !
            </p>

            <form
              onSubmit={handleAddActivity}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: "0.6rem",
                background: "rgba(15, 23, 42, 0.6)",
                padding: "0.9rem",
                borderRadius: "12px",
                border: "1px solid var(--border-subtle)"
              }}
            >
              <input
                type="text"
                className="input"
                placeholder="Titre de l'activité (ex: Loup-Garou géant, Visite Conques...)"
                value={newActTitle}
                onChange={(e) => setNewActTitle(e.target.value)}
                required
              />
              <select className="select" value={newActCat} onChange={(e) => setNewActCat(e.target.value)}>
                <option value="Sur place (Gîte)">🏰 Sur place (Gîte)</option>
                <option value="Excursion">🚗 Excursion / Village</option>
                <option value="Balade & Terroir">🧀 Balade & Terroir</option>
                <option value="Sport & Nature">🥾 Sport & Nature</option>
                <option value="Soirée & Jeux">🎲 Soirée & Jeux</option>
              </select>
              <input
                type="text"
                className="input"
                placeholder="Quand ? (ex: Mardi aprem, Soirée...)"
                value={newActDay}
                onChange={(e) => setNewActDay(e.target.value)}
              />
              <input
                type="text"
                className="input"
                placeholder="Détails (durée, distance...)"
                value={newActDesc}
                onChange={(e) => setNewActDesc(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">
                <Plus size={16} /> Proposer
              </button>
            </form>
          </div>

          <div className="grid-2">
            {activities.map((act) => {
              const votes = Array.isArray(act.votes) ? act.votes : [];
              const iVoted = votes.includes(userDisplayName);
              return (
                <div
                  key={act.id}
                  className="card"
                  style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "0.85rem" }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", marginBottom: "0.45rem" }}>
                      <span className="badge badge-gold">{act.category}</span>
                      <span className="badge badge-sky">📅 {act.day}</span>
                    </div>
                    <h3 style={{ fontSize: "1.08rem", fontWeight: 700, marginBottom: "0.35rem" }}>
                      {act.title}
                    </h3>
                    <p style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>{act.description}</p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingTop: "0.65rem",
                      borderTop: "1px solid var(--border-subtle)",
                      gap: "0.5rem",
                      flexWrap: "wrap"
                    }}
                  >
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      Proposé par <strong>{act.proposedBy}</strong>
                      {votes.length > 0 && (
                        <div style={{ color: "#34d399", marginTop: "0.15rem" }}>
                          🔥 Partants : {votes.join(", ")}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleActivityVote(act)}
                      className={`btn ${iVoted ? "btn-primary" : "btn-secondary"}`}
                      style={{ padding: "0.45rem 0.85rem", fontSize: "0.82rem" }}
                    >
                      <ThumbsUp size={15} /> {iVoted ? "Chaud 🔥" : "Je suis chaud"} ({votes.length})
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== TAB 5: GOOGLE PHOTOS ==================== */}
      {activeTab === "photos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="card card-gold" style={{ textAlign: "center", padding: "2rem 1.25rem" }}>
            <Camera size={46} color="#38bdf8" style={{ marginBottom: "0.75rem" }} />
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.45rem" }}>
              📸 L'Album Google Photos du Nouvel An 2027
            </h2>
            <p style={{ fontSize: "0.92rem", color: "#cbd5e1", maxWidth: "600px", margin: "0 auto 1.25rem" }}>
              Pour que tout le monde récupère les photos et vidéos en qualité originale (les enfants à la piscine, la soirée du Réveillon, les balades en Aveyron) sans saturer WhatsApp, tout est centralisé sur notre album partagé <strong>Google Photos</strong> !
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              {links.googlePhotosUrl ? (
                <a
                  href={links.googlePhotosUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-photos"
                  style={{ padding: "0.85rem 1.5rem", fontSize: "1rem" }}
                >
                  <Camera size={20} /> Ouvrir l'Album Google Photos Partagé <ExternalLink size={16} />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={openLinksModal}
                  className="btn btn-photos"
                  style={{ padding: "0.85rem 1.5rem", fontSize: "1rem" }}
                >
                  <Plus size={20} /> Coller le lien de l'album Google Photos
                </button>
              )}

              <button type="button" onClick={openLinksModal} className="btn btn-secondary">
                <Settings size={16} /> Modifier le lien de l'album
              </button>
            </div>
          </div>

          {/* Optional pinned highlights or sub-links */}
          <div className="card">
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.4rem" }}>
              🌟 Liens & Dossiers Photos / Vidéos épinglés
            </h3>
            <p style={{ fontSize: "0.83rem", color: "var(--text-muted)", marginBottom: "0.9rem" }}>
              Tu peux aussi épingler ici un lien vers un sous-album spécifique, un Drive ou une vidéo souvenir :
            </p>

            <form
              onSubmit={handleAddPhotoHighlight}
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.6rem", marginBottom: "1rem" }}
            >
              <input
                type="text"
                className="input"
                placeholder="Titre (ex: Album Réveillon 31 Déc., Photos drones...)"
                value={newPhotoTitle}
                onChange={(e) => setNewPhotoTitle(e.target.value)}
                required
              />
              <input
                type="url"
                className="input"
                placeholder="Lien https://photos.app.goo.gl/..."
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
                  💶 Récap Réservation & Budget Gîte
                </h3>
                <div style={{ fontSize: "0.86rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <div>• <strong>Forfait Semaine Nouvel An (7 nuits) :</strong> {GITE_INFO.budget.total} € TTC</div>
                  <div style={{ color: "#34d399" }}>
                    • <strong>Acompte 30% payé :</strong> {GITE_INFO.budget.depositPaid} € (virement du {GITE_INFO.budget.depositDate})
                  </div>
                  <div style={{ color: "#fbbf24" }}>
                    • <strong>Solde restant :</strong> {GITE_INFO.budget.balanceDue} € (à régler avant le {GITE_INFO.budget.balanceDeadline})
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
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

      {/* ==================== MODAL 1: SHARED LINKS (WhatsApp / Google Photos / Tricount / Playlist) ==================== */}
      <dialog ref={linksDialogRef} closedby="any" aria-labelledby="linksDialogTitle">
        <form onSubmit={saveSharedLinks} style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          <h3 id="linksDialogTitle" style={{ fontSize: "1.2rem", fontWeight: 800 }}>
            🔗 Liens partagés du Groupe
          </h3>
          <p style={{ fontSize: "0.83rem", color: "var(--text-muted)" }}>
            Ces liens sont synchronisés en temps réel pour tous les potes connectés :
          </p>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", marginBottom: "0.25rem", color: "#4ade80" }}>
              Lien d'invitation Groupe WhatsApp
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
            <label style={{ display: "block", fontSize: "0.8rem", marginBottom: "0.25rem", color: "#38bdf8" }}>
              Lien de l'Album Google Photos partagé
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
    </div>
  );
}

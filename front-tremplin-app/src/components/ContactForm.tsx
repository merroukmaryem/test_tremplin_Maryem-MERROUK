import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import axios, { AxiosError } from "axios";
import "./ContactForm.css"; 

// Définition des types
interface Disponibilite {
    day: string;
    time: string;
    minute: string;
}

interface FormData {
    civilite: "Mme" | "M" | "";
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
    message: string;
    motif_contact: "demande_visite" | "etre_rappele" | "plus_photos" | "";
    disponibilites: Disponibilite[];
}

// État initial d'une nouvelle disponibilité
const initialDispoState: Disponibilite = {
    day: "Lundi",
    time: "7h",
    minute: "00m",
};

// État initial du formulaire
const initialFormState: FormData = {
    civilite: "",
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    message: "",
    motif_contact: "",
    disponibilites: [], 
};

const daysOfWeek = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const hours = Array.from({ length: 14 }, (_, i) => `${i + 7}h`); // De 7h à 20h
const minutes = ["00m", "15m", "30m", "45m"];

export default function ContactForm() {
    const [form, setForm] = useState<FormData>(initialFormState);
    const [newDispo, setNewDispo] = useState<Disponibilite>(initialDispoState); 

    const [result, setResult] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleNewDispoChange = (field: "day" | "time" | "minute", value: string) => {
        setNewDispo(prev => ({ ...prev, [field]: value }));
    };

    // Ajoute la NOUVELLE dispo à la liste, puis réinitialise la nouvelle dispo
    const addDisponibilite = () => {
        // Validation simple avant d'ajouter
        if (!newDispo.day || !newDispo.time || !newDispo.minute) {
            setResult("Veuillez sélectionner le jour, l'heure et la minute.");
            return;
        }
        
        setForm(prev => ({
            ...prev,
            disponibilites: [...prev.disponibilites, newDispo] // Ajout de la nouvelle dispo
        }));
        
        setNewDispo(initialDispoState); // Réinitialisation des selects pour la prochaine saisie
        setResult(null); // Clear message
    };

    // Supprime la dispo de la liste enregistrée
    const removeDisponibilite = (i: number) => {
        const arr = form.disponibilites.filter((_, idx) => idx !== i);
        setForm(prev => ({ ...prev, disponibilites: arr }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setResult(null);
        setIsSuccess(false);
        setIsLoading(true);

        if (!form.civilite || !form.nom || !form.prenom || !form.email || !form.motif_contact) {
            setResult("Veuillez remplir tous les champs obligatoires (*).");
            setIsLoading(false);
            return;
        }

        const formattedDisponibilites = form.disponibilites
            .map(d => {
                const today = new Date();
                const currentDay = today.getDay() === 0 ? 6 : today.getDay() - 1;
                const targetDayIndex = daysOfWeek.indexOf(d.day);

                let diff = targetDayIndex - currentDay;
                if (diff < 0) {
                    diff += 7; 
                }
                const nextTargetDay = new Date(today);
                nextTargetDay.setDate(today.getDate() + diff);

                const year = nextTargetDay.getFullYear();
                const month = (nextTargetDay.getMonth() + 1).toString().padStart(2, '0');
                const day = nextTargetDay.getDate().toString().padStart(2, '0');
                const hour = d.time.replace('h', '').padStart(2, '0');
                const minute = d.minute.replace('m', '').padStart(2, '0');

                return `${year}-${month}-${day} ${hour}:${minute}:00`;
            })
            .filter(Boolean); 

        const payload = {
            ...form,
            disponibilites: formattedDisponibilites,
        };

        try {
            const res = await axios.post("http://localhost/submit.php", payload, {
                headers: { "Content-Type": "application/json" }
            });

            setResult(res.data.message);
            if (res.data.status === "success") {
                setIsSuccess(true);
                setForm(initialFormState);
                setNewDispo(initialDispoState); 
            }
        } catch (err) {
            const error = err as AxiosError;
            if (error.response) {
                const errorData = error.response.data as { message: string };
                setResult(errorData.message || "Une erreur est survenue lors de la soumission.");
            } else {
                setResult("Impossible de joindre le serveur PHP. Vérifiez Docker et l'URL.");
            }
            setIsSuccess(false);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="contact-form-container">
            <form onSubmit={handleSubmit} className="contact-form">
                <h2 className="form-title">CONTACTEZ L'AGENCE</h2>

                {/* Section Coordonnées */}
                <div className="form-section coords-section">
                    <h3 className="section-title">VOS COORDONNÉES</h3>
                    <div className="radio-group">
                        <label className="radio-label"><input type="radio" name="civilite" value="Mme" checked={form.civilite === "Mme"} onChange={handleChange} required /> Mme</label>
                        <label className="radio-label"><input type="radio" name="civilite" value="M" checked={form.civilite === "M"} onChange={handleChange} required /> M</label>
                    </div>
                    <input className="text-input" name="nom" placeholder="Nom" value={form.nom} onChange={handleChange} required />
                    <input className="text-input" name="prenom" placeholder="Prénom" value={form.prenom} onChange={handleChange} required />
                    <input className="text-input" name="email" type="email" placeholder="Adresse mail" value={form.email} onChange={handleChange} required />
                    <input className="text-input" name="telephone" placeholder="Téléphone" value={form.telephone} onChange={handleChange} />
                </div>

                {/* Section Message et Motif */}
                <div className="form-section message-section">
                    <h3 className="section-title">VOTRE MESSAGE</h3>
                    <div className="radio-group">
                        <label className="radio-label"><input type="radio" name="motif_contact" value="demande_visite" checked={form.motif_contact === "demande_visite"} onChange={handleChange} required /> Demande de visite</label>
                        <label className="radio-label"><input type="radio" name="motif_contact" value="etre_rappele" checked={form.motif_contact === "etre_rappele"} onChange={handleChange} required /> Être rappelé(e)</label>
                        <label className="radio-label"><input type="radio" name="motif_contact" value="plus_photos" checked={form.motif_contact === "plus_photos"} onChange={handleChange} required /> Plus de photos</label>
                    </div>
                    <textarea className="textarea-input" name="message" placeholder="Votre message" value={form.message} onChange={handleChange} required />
                </div>

                {/* Section Disponibilités */}
                <div className="form-section disponibilites-section">
                    <h3 className="section-title">DISPONIBILITÉS POUR UNE VISITE</h3>
                    
                    {/* Conteneur pour la NOUVELLE DISPONIBILITÉ à AJOUTER */}
                    <div className="dispo-input-group">
                        <select value={newDispo.day} onChange={(e) => handleNewDispoChange("day", e.target.value)} className="select-input">
                            {daysOfWeek.map(day => <option key={day} value={day}>{day}</option>)}
                        </select>
                        <select value={newDispo.time} onChange={(e) => handleNewDispoChange("time", e.target.value)} className="select-input hour-select">
                            {hours.map(hour => <option key={hour} value={hour}>{hour}</option>)}
                        </select>
                        <select value={newDispo.minute} onChange={(e) => handleNewDispoChange("minute", e.target.value)} className="select-input minute-select">
                            {minutes.map(minute => <option key={minute} value={minute}>{minute}</option>)}
                        </select>
                        
                        <button type="button" onClick={addDisponibilite} className="add-dispo-btn">AJOUTER DISPO</button>
                    </div>

                    {/* Conteneur pour les DISPONIBILITÉS DÉJÀ ENREGISTRÉES */}
                    <div className="dispo-list-container">
                        {form.disponibilites.map((d, i) => (
                            <div key={i} className="dispo-item-saved">
                                <span>{d.day} à {d.time.replace('h', '')}:{d.minute.replace('m', '')}</span> 
                                <button type="button" onClick={() => removeDisponibilite(i)} className="remove-saved-btn">
                                    <span className="remove-icon">x</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bouton ENVOYER */}
                <div className="submit-section">
                    <button type="submit" className="submit-btn" disabled={isLoading}>
                        {isLoading ? "ENVOI..." : "ENVOYER"}
                    </button>
                </div>

                {/* Affichage du résultat */}
                {result && (
                    <p className={`result-message ${isSuccess ? "success" : "error"}`}>
                        {result}
                    </p>
                )}
            </form>
        </div>
    );
}
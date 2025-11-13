<?php

require_once 'config.php';
header('Content-Type: application/json');

//Récupération et décodage des données JSON
$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Pas de données reçues.']);
    exit;
}

//Validation et Nettoyage des données

$civilite = filter_var($data['civilite'] ?? '', FILTER_SANITIZE_STRING);
$nom = filter_var(trim($data['nom'] ?? ''), FILTER_SANITIZE_STRING);
$prenom = filter_var(trim($data['prenom'] ?? ''), FILTER_SANITIZE_STRING);
$email = filter_var($data['email'] ?? '', FILTER_VALIDATE_EMAIL); // Renvoie false si invalide
$telephone = filter_var(trim($data['telephone'] ?? ''), FILTER_SANITIZE_STRING);
$message = filter_var(trim($data['message'] ?? ''), FILTER_SANITIZE_STRING);
$motif_contact = filter_var($data['motif_contact'] ?? '', FILTER_SANITIZE_STRING);
$disponibilites = $data['disponibilites'] ?? []; // Array attendu

// Validation des champs obligatoires
if (empty($civilite) || empty($nom) || empty($prenom) || $email === false || empty($motif_contact)) {
    http_response_code(422);
    echo json_encode(['status' => 'error', 'message' => 'Veuillez vérifier les champs obligatoires (Nom, Prénom, Email, Motif).']);
    exit;
}

//Insertion dans la DB

try {
    $pdo->beginTransaction();

    // Insertion dans la table 'contacts'
    // La colonne `created_at` utilise le DEFAULT CURRENT_TIMESTAMP, pas besoin de l'inclure ici.
    $sql_contact = "INSERT INTO contacts (civilite, nom, prenom, email, telephone, message, motif_contact)
                    VALUES (:civilite, :nom, :prenom, :email, :telephone, :message, :motif_contact)";

    $stmt = $pdo->prepare($sql_contact);

    $stmt->execute([
        ':civilite' => $civilite,
        ':nom' => $nom,
        ':prenom' => $prenom,
        ':email' => $email,
        ':telephone' => $telephone,
        ':message' => $message,
        ':motif_contact' => $motif_contact,
    ]);

    // Récupérer l'ID du contact nouvellement inséré pour la clé étrangère
    $contact_id = $pdo->lastInsertId();

    // Insertion dans la table 'disponibilites' (si des dates sont fournies)
    if (!empty($disponibilites) && is_array($disponibilites)) {
        $sql_disp = "INSERT INTO disponibilites (contact_id, date_disponibilite) VALUES (:contact_id, :date_disponibilite)";
        $stmt_disp = $pdo->prepare($sql_disp);

        foreach ($disponibilites as $date_str) {
            if (!empty($date_str)) {
                $stmt_disp->execute([
                    ':contact_id' => $contact_id,
                    ':date_disponibilite' => $date_str // Doit être au format YYYY-MM-DD HH:MM:SS
                ]);
            }
        }
    }

    // Valider la transaction
    $pdo->commit();

    http_response_code(201); // Crée
    echo json_encode(['status' => 'success', 'message' => 'Formulaire enregistré avec succès.']);

} catch (PDOException $e) {
    // Gestion des erreurs DB
    if ($pdo->inTransaction()) {
        $pdo->rollBack(); // Annuler toutes les insertions si une erreur survient
    }
    error_log("DB Error: " . $e->getMessage());

    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Erreur lors de l\'enregistrement des données. Veuillez réessayer.']);
}
?>
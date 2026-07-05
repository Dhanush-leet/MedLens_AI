import { MongoClient } from 'mongodb';
import { ChatSession, Message, EmergencyContact, EmergencyAlert, User } from '../frontend/types';

class MongoReplicaDB {
  private client: MongoClient;
  private dbName: string;
  private isConnected = false;

  constructor() {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
    this.dbName = process.env.MONGODB_DB || 'medlens';
    this.client = new MongoClient(uri);
  }

  private async ensureConnected() {
    if (this.isConnected) return;
    try {
      await this.client.connect();
      const database = this.client.db(this.dbName);
      await database.collection('users').createIndex({ email: 1 }, { unique: true });
      this.isConnected = true;
      console.log(`[DB] Successfully connected to MongoDB database: ${this.dbName}`);
    } catch (err) {
      console.error('[DB] Failed to connect to MongoDB. Ensure your Docker container or database is running:', err);
      throw err;
    }
  }

  private get database() {
    return this.client.db(this.dbName);
  }

  public async getUserByEmail(email: string): Promise<User | undefined> {
    await this.ensureConnected();
    const lowerEmail = email.toLowerCase();
    const doc = await this.database.collection('users').findOne({ email: lowerEmail });
    if (!doc) return undefined;
    return {
      id: doc.id,
      name: doc.name,
      email: doc.email,
      password_hash: doc.password_hash,
      created_at: doc.created_at,
      language_preference: doc.language_preference
    };
  }

  public async getUserById(id: string): Promise<User | undefined> {
    await this.ensureConnected();
    const doc = await this.database.collection('users').findOne({ id });
    if (!doc) return undefined;
    return {
      id: doc.id,
      name: doc.name,
      email: doc.email,
      password_hash: doc.password_hash,
      created_at: doc.created_at,
      language_preference: doc.language_preference
    };
  }

  public async createUser(userData: Omit<User, 'id' | 'created_at'>): Promise<User> {
    await this.ensureConnected();
    const id = `user_${Date.now()}`;
    const user: User = {
      ...userData,
      id,
      created_at: new Date().toISOString()
    };
    await this.database.collection('users').insertOne(user);
    return user;
  }

  public async getSession(id: string): Promise<ChatSession | undefined> {
    await this.ensureConnected();
    const doc = await this.database.collection('sessions').findOne({ id });
    if (!doc) return undefined;
    return {
      id: doc.id,
      messages: doc.messages || [],
      createdAt: doc.createdAt,
      language: doc.language,
      userId: doc.userId
    };
  }

  public async listSessions(userId?: string): Promise<{ id: string; createdAt: string; lastMessageText: string; language?: 'en' | 'ta' }[]> {
    await this.ensureConnected();
    const query = userId ? { userId } : {};
    const cursor = this.database.collection('sessions').find(query);
    const sessions = await cursor.toArray();
    
    return sessions.map(s => {
      const lastMsg = s.messages && s.messages.length > 0 ? s.messages[s.messages.length - 1] : null;
      return {
        id: s.id,
        createdAt: s.createdAt,
        lastMessageText: lastMsg ? lastMsg.text : 'Empty Session',
        language: s.language
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async createSession(id: string, userId?: string): Promise<ChatSession> {
    await this.ensureConnected();
    const session: ChatSession = {
      id,
      messages: [],
      createdAt: new Date().toISOString(),
      userId
    };
    await this.database.collection('sessions').insertOne(session);
    return session;
  }

  public async addMessage(sessionId: string, message: Message): Promise<ChatSession> {
    await this.ensureConnected();
    let session = await this.getSession(sessionId);
    if (!session) {
      session = await this.createSession(sessionId);
    }
    await this.database.collection('sessions').updateOne(
      { id: sessionId },
      { $push: { messages: message } as any }
    );
    const updated = await this.getSession(sessionId);
    return updated!;
  }

  public async updateMessage(sessionId: string, messageId: string, updatedMessage: Partial<Message>): Promise<ChatSession> {
    await this.ensureConnected();
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found.`);
    }
    const idx = session.messages.findIndex(m => m.id === messageId);
    if (idx !== -1) {
      const updateKey = `messages.${idx}`;
      const updateObj: Record<string, any> = {};
      for (const [k, v] of Object.entries(updatedMessage)) {
        updateObj[`${updateKey}.${k}`] = v;
      }
      await this.database.collection('sessions').updateOne(
        { id: sessionId },
        { $set: updateObj }
      );
    }
    const updated = await this.getSession(sessionId);
    return updated!;
  }

  public async setSessionLanguage(sessionId: string, language: 'en' | 'ta'): Promise<ChatSession> {
    await this.ensureConnected();
    await this.database.collection('sessions').updateOne(
      { id: sessionId },
      { $set: { language } }
    );
    const updated = await this.getSession(sessionId);
    return updated!;
  }

  public async getEmergencyContact(sessionId: string): Promise<EmergencyContact | undefined> {
    await this.ensureConnected();
    const doc = await this.database.collection('emergency_contacts').findOne({ sessionId });
    if (!doc) return undefined;
    return {
      sessionId: doc.sessionId,
      name: doc.name,
      phone: doc.phone,
      email: doc.email,
      relation: doc.relation,
      consentGivenAt: doc.consentGivenAt
    };
  }

  public async saveEmergencyContact(contact: EmergencyContact): Promise<EmergencyContact> {
    await this.ensureConnected();
    await this.database.collection('emergency_contacts').updateOne(
      { sessionId: contact.sessionId },
      { $set: contact },
      { upsert: true }
    );
    return contact;
  }

  public async logEmergencyAlert(alert: EmergencyAlert): Promise<EmergencyAlert> {
    await this.ensureConnected();
    await this.database.collection('emergency_alerts').insertOne(alert);
    return alert;
  }

  public async clearUserSessions(userId: string): Promise<void> {
    await this.ensureConnected();
    const cursor = this.database.collection('sessions').find({ userId });
    const userSessions = await cursor.toArray();
    const sessionIds = userSessions.map(s => s.id);

    if (sessionIds.length > 0) {
      await this.database.collection('sessions').deleteMany({ userId });
      await this.database.collection('emergency_contacts').deleteMany({ sessionId: { $in: sessionIds } });
      await this.database.collection('emergency_alerts').deleteMany({ sessionId: { $in: sessionIds } });
    }
  }
}

export const db = new MongoReplicaDB();

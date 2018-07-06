'use strict';

const uuid = require('uuid/v4');

const {
  EventEmitter
} = require('events');

/**
 * NB: The subs are stored in 2 maps shared by all instances of the NATS class.
 */
const subsBySid = new Map();
const subsBySubject = new Map();

class NATS extends EventEmitter {
  /**
   * The mocked transport's subs for testing purposes.
   */
  static get subs() {
    return subsBySid;
  }

  /**
   * Fakes a connection to a nats-server and returns the client.
   *
   * @returns {NATS} client
   */
  static connect() {
    const nats =  new NATS();
    process.nextTick(() => nats.emit('connect'));

    return nats;
  }

  /**
   * Fakes a disconnection.
   */
  close() {
    process.nextTick(() => this.emit('disconnect'));
  }

  /**
   * Subscribe to a given subject.
   * TODO: implement `options` argument.
   *
   * @param {String} subject
   * @param {Function} callback
   *
   * @returns {String} sid
   */
  subscribe(subject, callback) {
    // TODO: validate subject syntax
    const sid = uuid();

    const sub = {
      sid,
      subject,
      callback
    };

    this._addSub(sub);

    return sid;
  }

  /**
   * Unsubscribe to a given Subscriber Id.
   *
   * @param {String} sid
   */
  unsubscribe(sid) {
    const sub = subsBySid.get(sid);

    if (sub == null) return;

    subsBySid.delete(sid);
    subsBySubject.get(sub.subject).delete(sid);
  }

  /**
   * Publish a message to the given subject, with optional `replyTo`.
   * TODO: implement optional callback
   *
   * @param {String} subject
   * @param {String} message
   * @param {String} replyTo
   */
  publish(subject, message, replyTo) {
    const subs = this._getSubsBySubject(subject);

    for (const sub of subs) {
      sub.callback(message, replyTo, subject);
    }
  }

  /**
   * Subscribe to an ad hoc subject to get a reply after publishing using this
   * ad hoc subject as the replyTo.
   *
   * @param {String} subject
   * @param {String} message
   * @param {Object} options
   * @param {Function} callback
   *
   * @returns {String} sid
   */
  request(subject, message, options, callback) {
    const sid = uuid();

    const sub = {
      sid,
      subject: sid,
      callback
    };

    this._addSub(sub);

    this.publish(subject, message, sid);

    return sid;
  }

  _getSubsBySubject(subject) {
    return Array.from(subsBySubject.keys())
      .filter(_subject => {
        // NB: this assumes a valid subject syntax
        const regExpString = _subject
          .replace('>',   '[a-zA-Z0-9\\.]+') // '>' full wildcard
          .replace(/\*/g, '[a-zA-Z0-9]+')    // '*' token wildcard
          .replace(/\./g, '\\.');            // escape dots

        const regExp = new RegExp(`^${regExpString}$`, 'g');
        return regExp.test(subject);
      })
      // Get subjects and flatten them
      .reduce((acc, s) => [ ...acc, ...subsBySubject.get(s).values() ], []);
  }

  _addSub(sub) {
    subsBySid.set(sub.sid, sub);

    // NOTE: `subsBySubject` is a map (by subject) of maps (by sid)
    const subjectSubs = subsBySubject.get(sub.subject) || new Map();
    subjectSubs.set(sub.sid, sub);
    subsBySubject.set(sub.subject, subjectSubs);
  }
}

module.exports = NATS;

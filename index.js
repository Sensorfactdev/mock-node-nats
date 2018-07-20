'use strict';

const uuid = require('uuid/v4');

const {
  EventEmitter
} = require('events');

// Legal characters
const chars = 'a-zA-Z0-9\\-\\_';

/**
 * NB: The subs are stored in 2 maps shared by all instances of the NATS class.
 */
let _subs = new Map();

class NATS extends EventEmitter {
  /**
   * The mocked transport's subs for testing purposes.
   */
  static get subs() {
    return _subs;
  }

  static set subs(subs) {
    if (!(subs instanceof Map))
      throw new TypeError('subs must be a map');

    _subs = subs;
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

    // Handle wild cards
    // NB: this assumes a valid subject syntax
    const _subject = `^${subject
      .replace('>',   `[${chars}\\.]+`) // '>' full wildcard
      .replace(/\*/g, `[${chars}]+`)    // '*' token wildcard
      .replace(/\./g, '\\.')}$`;        // escape dots

    const sub = {
      sid,
      subject: _subject,
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
    const sub = _subs.get(sid);

    if (sub == null) return;

    _subs.delete(sid);
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
    return Array.from(_subs.values())
      .filter(({ subject: _subject }) =>
        new RegExp(_subject, 'g').test(subject));
  }

  _addSub(sub) {
    _subs.set(sub.sid, sub);
  }
}

module.exports = NATS;

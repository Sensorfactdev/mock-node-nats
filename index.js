'use strict';

const uuid = require('uuid/v4');

const {
  EventEmitter
} = require('events');

/**
 * NB: The subs are stored in an array shared by all instances of the Transport
 *     class.
 */
const subs = [];

class NATS extends EventEmitter {
  constructor() {
    super();
    this.connected = false;
  }

  /**
   * The mocked transport's subs for testing purposes.
   */
  static get subs() {
    return subs;
  }

  /**
   * Fakes a connection to a nats-server and returns the client.
   */
  static connect() {
    this.connected = true;

    const nats =  new NATS();
    process.nextTick(() => nats.emit('connect'));

    return nats;
  }

  /**
   * Fakes a disconnection.
   */
  close() {
    this.connected = false;
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
    const sid = uuid();

    subs.push({
      sid,
      subject,
      callback
    });

    return sid;
  }

  /**
   * Unsubscribe to a given Subscriber Id.
   *
   * @param {String} sid
   */
  unsubscribe(sid) {
    const sub = this._findSubBySid(sid);
    subs.splice(subs.indexOf(sub), 1);
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
    const _subs = this._findSubsBySubject(subject);

    for (const sub of _subs) {
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
   */
  request(subject, message, options, callback) {
    const sid = uuid();

    subs.push({
      sid,
      subject: sid,
      callback
    });

    this.publish(subject, message, sid);

    return sid;
  }

  _findSubBySid(sid) {
    return subs.filter(sub => sub.sid === sid);
  }

  _findSubsBySubject(subject) {
    return subs.filter(sub => sub.subject === subject);
  }
}

module.exports = NATS;

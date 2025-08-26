'use strict';
const { randomUUID } = require('crypto');
const uuid = () => (typeof randomUUID === 'function'
  ? randomUUID()
  : Date.now().toString(36) + Math.random().toString(36).slice(2));

/**
 * Estructura en memoria:
 * boards = {
 *   'board': [{
 *      _id, text, delete_password, reported, created_on, bumped_on,
 *      replies: [{ _id, text, delete_password, reported, created_on }]
 *   }]
 * }
 */
const boards = {};
const getBoard = (name) => (boards[name] ||= []);

module.exports = function (app) {
  // THREADS
  app.route('/api/threads/:board')
    .post((req, res) => {
      const board = req.params.board;
      const { text, delete_password } = req.body;
      const now = new Date();
      getBoard(board).unshift({
        _id: uuid(),
        text, delete_password,
        reported: false,
        created_on: now,
        bumped_on: now,
        replies: []
      });
      return res.redirect('/b/' + board + '/');
    })
    .get((req, res) => {
      const board = req.params.board;
      const list = getBoard(board)
        .slice()
        .sort((a, b) => new Date(b.bumped_on) - new Date(a.bumped_on))
        .slice(0, 10)
        .map(t => ({
          _id: t._id,
          text: t.text,
          created_on: t.created_on,
          bumped_on: t.bumped_on,
          replies: t.replies
            .slice()
            .sort((a, b) => new Date(b.created_on) - new Date(a.created_on))
            .slice(0, 3)
            .map(r => ({ _id: r._id, text: r.text, created_on: r.created_on })),
          replycount: t.replies.length
        }));
      return res.json(list);
    })
    .put((req, res) => {
      const { thread_id } = req.body;
      const board = req.params.board;
      const t = getBoard(board).find(x => x._id === thread_id);
      if (!t) return res.send('thread not found');
      t.reported = true;
      return res.send('reported');
    })
    .delete((req, res) => {
      const board = req.params.board;
      const { thread_id, delete_password } = req.body;
      const list = getBoard(board);
      const i = list.findIndex(x => x._id === thread_id);
      if (i === -1) return res.send('incorrect password');
      if (list[i].delete_password !== delete_password) return res.send('incorrect password');
      list.splice(i, 1);
      return res.send('success');
    });

  // REPLIES
  app.route('/api/replies/:board')
    .post((req, res) => {
      const board = req.params.board;
      const { thread_id, text, delete_password } = req.body;
      const t = getBoard(board).find(x => x._id === thread_id);
      if (!t) return res.status(404).send('thread not found');
      t.replies.push({
        _id: uuid(),
        text, delete_password,
        reported: false,
        created_on: new Date()
      });
      t.bumped_on = new Date();
      return res.redirect('/b/' + board + '/' + thread_id);
    })
    .get((req, res) => {
      const board = req.params.board;
      const { thread_id } = req.query;
      const t = getBoard(board).find(x => x._id === thread_id);
      if (!t) return res.status(404).send('thread not found');
      return res.json({
        _id: t._id,
        text: t.text,
        created_on: t.created_on,
        bumped_on: t.bumped_on,
        replies: t.replies.map(r => ({ _id: r._id, text: r.text, created_on: r.created_on }))
      });
    })
    .put((req, res) => {
      const board = req.params.board;
      const { thread_id, reply_id } = req.body;
      const t = getBoard(board).find(x => x._id === thread_id);
      if (!t) return res.status(404).send('thread not found');
      const r = t.replies.find(rr => rr._id === reply_id);
      if (!r) return res.status(404).send('reply not found');
      r.reported = true;
      return res.send('reported');
    })
    .delete((req, res) => {
      const board = req.params.board;
      const { thread_id, reply_id, delete_password } = req.body;
      const t = getBoard(board).find(x => x._id === thread_id);
      if (!t) return res.status(404).send('thread not found');
      const r = t.replies.find(rr => rr._id === reply_id);
      if (!r) return res.status(404).send('reply not found');
      if (r.delete_password !== delete_password) return res.send('incorrect password');
      r.text = '[deleted]';
      return res.send('success');
    });
};

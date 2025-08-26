const chai = require('chai');
const assert = chai.assert;
const chaiHttp = require('chai-http');
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {
  let board = 'fcc_test_board';
  let threadId;
  let replyId;

  const threadPwd = 'pass123';
  const wrongPwd = 'nope999';
  const replyPwd = 'rep123';

  test('POST /api/threads/:board', function(done) {
    chai.request(server)
      .post('/api/threads/' + board)
      .type('form')
      .send({ text: 'Hello FCC', delete_password: threadPwd })
      .end((err, res) => {
        assert.oneOf(res.status, [200, 302]);
        done();
      });
  });

  test('GET /api/threads/:board', function(done) {
    chai.request(server)
      .get('/api/threads/' + board)
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.isArray(res.body);
        assert.isAtMost(res.body.length, 10);
        assert.exists(res.body[0]._id);
        threadId = res.body[0]._id;
        assert.notProperty(res.body[0], 'delete_password');
        assert.notProperty(res.body[0], 'reported');
        assert.isArray(res.body[0].replies);
        assert.isAtMost(res.body[0].replies.length, 3);
        done();
      });
  });

  test('PUT /api/threads/:board', function(done) {
    chai.request(server)
      .put('/api/threads/' + board)
      .send({ thread_id: threadId })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'reported');
        done();
      });
  });

  test('POST /api/replies/:board', function(done) {
    chai.request(server)
      .post('/api/replies/' + board)
      .type('form')
      .send({ thread_id: threadId, text: 'first reply', delete_password: replyPwd })
      .end((err, res) => {
        assert.oneOf(res.status, [200, 302]);
        done();
      });
  });

  test('GET /api/replies/:board', function(done) {
    chai.request(server)
      .get('/api/replies/' + board)
      .query({ thread_id: threadId })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.isObject(res.body);
        assert.equal(res.body._id, threadId);
        assert.isArray(res.body.replies);
        assert.isAtLeast(res.body.replies.length, 1);
        replyId = res.body.replies[0]._id;
        assert.notProperty(res.body, 'delete_password');
        assert.notProperty(res.body, 'reported');
        done();
      });
  });

  test('PUT /api/replies/:board', function(done) {
    chai.request(server)
      .put('/api/replies/' + board)
      .send({ thread_id: threadId, reply_id: replyId })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'reported');
        done();
      });
  });

  test('DELETE /api/replies/:board wrong password', function(done) {
    chai.request(server)
      .delete('/api/replies/' + board)
      .send({ thread_id: threadId, reply_id: replyId, delete_password: 'zzz' })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'incorrect password');
        done();
      });
  });

  test('DELETE /api/replies/:board correct password', function(done) {
    chai.request(server)
      .delete('/api/replies/' + board)
      .send({ thread_id: threadId, reply_id: replyId, delete_password: replyPwd })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'success');
        done();
      });
  });

  test('DELETE /api/threads/:board wrong password', function(done) {
    chai.request(server)
      .delete('/api/threads/' + board)
      .send({ thread_id: threadId, delete_password: 'zzz' })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'incorrect password');
        done();
      });
  });

  test('DELETE /api/threads/:board correct password', function(done) {
    // crear otro thread para borrar
    chai.request(server)
      .post('/api/threads/' + board)
      .type('form')
      .send({ text: 'to be deleted', delete_password: threadPwd })
      .end(() => {
        chai.request(server)
          .get('/api/threads/' + board)
          .end((_, r2) => {
            const t = r2.body.find(x => x.text === 'to be deleted');
            const idToDelete = t ? t._id : threadId;
            chai.request(server)
              .delete('/api/threads/' + board)
              .send({ thread_id: idToDelete, delete_password: threadPwd })
              .end((err3, res3) => {
                assert.equal(res3.status, 200);
                assert.equal(res3.text, 'success');
                done();
              });
          });
      });
  });
});
